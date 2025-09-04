import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Puzzle, InventoryObject } from '../types';
import Icon from '../components/Icon';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import ObjectItem from '../components/presenter/ObjectItem';
import PuzzleItem from '../components/presenter/PuzzleItem';
import ActionItem from '../components/presenter/ActionItem';
import { usePresenterState } from '../hooks/usePresenterState';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_UPDATE';
  roomIndex?: number;
}

type Status = 'loading' | 'success' | 'error';

const PresenterView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [presentationWindow, setPresentationWindow] = useState<Window | null>(null);
  const [visibleDescriptionIds, setVisibleDescriptionIds] = useState<Set<string>>(new Set());
  const [puzzleToSolve, setPuzzleToSolve] = useState<Puzzle | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [solveError, setSolveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'inventory'>('rooms');
  const [showInventoryNotification, setShowInventoryNotification] = useState(false);
  
  const { 
    lockingPuzzlesByRoomId, 
    lockingPuzzlesByPuzzleId,
    allUnsolvedPuzzles, 
    inventoryObjects 
  } = usePresenterState(game);

  const prevInventoryCountRef = useRef(inventoryObjects.length);
  const prevInventoryRef = useRef<InventoryObject[]>(inventoryObjects);
  
  useEffect(() => {
    // If an item was added and the inventory tab is not active, show notification.
    if (inventoryObjects.length > prevInventoryCountRef.current && activeTab !== 'inventory') {
        setShowInventoryNotification(true);
    }
    // Update the ref to the current count for the next render.
    prevInventoryCountRef.current = inventoryObjects.length;
  }, [inventoryObjects.length, activeTab]);

  useEffect(() => {
    const prevIds = new Set(prevInventoryRef.current.map(o => o.id));
    const currentIds = new Set(inventoryObjects.map(o => o.id));

    const newlyAddedIds = inventoryObjects
      .filter(o => !prevIds.has(o.id))
      .map(o => o.id);

    // This effect ensures that:
    // 1. Newly added inventory items have their descriptions visible by default.
    // 2. The visibility state of items removed from inventory is cleaned up.
    // 3. Manual hide/show toggles are preserved during re-renders.
    if (newlyAddedIds.length > 0 || prevIds.size !== currentIds.size) {
        setVisibleDescriptionIds(currentVisibleIds => {
            const newVisibleIds = new Set(currentVisibleIds);

            // Add newly added inventory items to the visible set
            newlyAddedIds.forEach(id => newVisibleIds.add(id));

            // Remove items that are no longer in the inventory from the visible set
            currentVisibleIds.forEach(id => {
                if (!currentIds.has(id)) {
                    newVisibleIds.delete(id);
                }
            });

            return newVisibleIds;
        });
    }

    prevInventoryRef.current = inventoryObjects;
  }, [inventoryObjects]);


  const isPresentationWindowOpen = presentationWindow && !presentationWindow.closed;

  const channelName = `game-${id}`;
  const postMessage = useBroadcastChannel<BroadcastMessage>(channelName, () => {});

  useEffect(() => {
    const interval = setInterval(() => {
      if (presentationWindow?.closed) {
        setPresentationWindow(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [presentationWindow]);

  useEffect(() => {
    const fetchAndInitialize = async () => {
      if (!id) return;
      setStatus('loading');
      const data = await gameService.getGame(id);
      if (data) {
        if (data.rooms.length > 0 && data.visitedRoomIds.length === 0) {
          // On first load, mark the initial room as visited
          const initialVisited: Game = {
            ...data,
            visitedRoomIds: [data.rooms[0].id],
          };
          setGame(initialVisited);
          await gameService.saveGame(initialVisited);
        } else {
          setGame(data);
        }
        setStatus('success');
      } else {
        setStatus('error');
      }
    };
    fetchAndInitialize();

    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'presentations' && id) {
        const data = await gameService.getGame(id);
        if (data) {
          setGame(data);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [id]);

  const updateAndBroadcast = useCallback(async (updatedGame: Game) => {
    setGame(updatedGame);
    try {
        await gameService.saveGame(updatedGame);
        postMessage({ type: 'STATE_UPDATE' });
    } catch (error) {
        console.error("Failed to save game state:", error);
        alert("A change could not be saved. Please check your connection.");
    }
  }, [postMessage]);

  const goToRoom = useCallback((index: number) => {
    if (!game) return;
    if (index >= 0 && index < game.rooms.length) {
      setCurrentRoomIndex(index);
      postMessage({ type: 'GOTO_ROOM', roomIndex: index });

      const newRoomId = game.rooms[index].id;
      if (!game.visitedRoomIds.includes(newRoomId)) {
        const updatedGame = {
          ...game,
          visitedRoomIds: [...game.visitedRoomIds, newRoomId],
        };
        updateAndBroadcast(updatedGame);
      }
    }
  }, [game, postMessage, updateAndBroadcast]);


  const handleToggleObject = (objectId: string, newState: boolean) => {
    if (!game) return;

    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            objects: room.objects.map(obj =>
                obj.id === objectId ? { ...obj, showInInventory: newState } : obj
            )
        }))
    };
    updateAndBroadcast(updatedGame);
  };

  const handleTogglePuzzle = (puzzleId: string, newState: boolean) => {
    if (!game) return;

    let targetPuzzle: Puzzle | null = null;
    let targetRoomId: string | null = null;
    for (const room of game.rooms) {
        const foundPuzzle = room.puzzles.find(p => p.id === puzzleId);
        if (foundPuzzle) {
            targetPuzzle = foundPuzzle;
            targetRoomId = room.id;
            break;
        }
    }

    if (!targetPuzzle || !targetRoomId) return;

    const shouldAutoAdd = newState && targetPuzzle.autoAddLockedObjects;
    const objectIdsToUpdate = shouldAutoAdd ? targetPuzzle.lockedObjectIds : [];
    
    const updatedRooms = game.rooms.map(room => {
        let newObjects = room.objects;
        if (room.id === targetRoomId && shouldAutoAdd) {
            newObjects = room.objects.map(obj => 
                objectIdsToUpdate.includes(obj.id) ? { ...obj, showInInventory: true } : obj
            );
        }

        const newPuzzles = room.puzzles.map(p => {
            if (p.id === puzzleId) {
                // If the puzzle is being solved, also set its showImageOverlay to false.
                return { ...p, isSolved: newState, showImageOverlay: newState ? false : p.showImageOverlay };
            }
            return p;
        });
        
        return { ...room, objects: newObjects, puzzles: newPuzzles };
    });
    
    const updatedGame = { ...game, rooms: updatedRooms };
    updateAndBroadcast(updatedGame);
  };
  
  const handleAttemptSolve = (puzzleId: string) => {
    if (!game) return;
    for (const room of game.rooms) {
        const puzzle = room.puzzles.find(p => p.id === puzzleId);
        if (puzzle) {
            setPuzzleToSolve(puzzle);
            setSubmittedAnswer('');
            setSolveError(null);
            break;
        }
    }
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puzzleToSolve) return;

    // Input is already sanitized by the onChange handler
    if (submittedAnswer === puzzleToSolve.answer) {
        handleTogglePuzzle(puzzleToSolve.id, true);
        setPuzzleToSolve(null);
    } else {
        setSolveError('Incorrect answer. Please try again.');
        setSubmittedAnswer('');
    }
  };

  const handleTogglePuzzleImage = (puzzleId: string, newState: boolean) => {
    if (!game || !game.rooms[currentRoomIndex]) return;
    const currentRoomId = game.rooms[currentRoomIndex].id;

    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => {
            if (room.id !== currentRoomId) return room;
            
            const newActions = (room.actions || []).map(a => ({ ...a, showImageOverlay: false }));
            const newPuzzles = room.puzzles.map(p => {
                if (p.id === puzzleId) return { ...p, showImageOverlay: newState };
                if (newState) return { ...p, showImageOverlay: false };
                return p;
            });
            
            return {
                ...room,
                puzzles: newPuzzles,
                actions: newActions
            };
        })
    };
    updateAndBroadcast(updatedGame);
  };

  const handleToggleActionImage = (actionId: string, newState: boolean) => {
    if (!game || !game.rooms[currentRoomIndex]) return;
    const currentRoomId = game.rooms[currentRoomIndex].id;

    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => {
            if (room.id !== currentRoomId) return room;

            const newPuzzles = room.puzzles.map(p => ({ ...p, showImageOverlay: false }));
            const newActions = (room.actions || []).map(a => {
                if (a.id === actionId) return { ...a, showImageOverlay: newState };
                if (newState) return { ...a, showImageOverlay: false };
                return a;
            });

            return {
                ...room,
                puzzles: newPuzzles,
                actions: newActions,
            };
        })
    };
    updateAndBroadcast(updatedGame);
  };
  
  const handleToggleDescriptionVisibility = (objectId: string) => {
      setVisibleDescriptionIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(objectId)) {
              newSet.delete(objectId);
          } else {
              newSet.add(objectId);
          }
          return newSet;
      });
  };

  if (status === 'loading') {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Loading Presenter View...</div>;
  }
  
  if (status === 'error' || !game) {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Error: Could not load game.</div>;
  }
  
  const currentRoom = game.rooms[currentRoomIndex];
  const availableObjects = currentRoom?.objects.filter(o => !o.showInInventory) || [];

  return (
    <div className="h-screen bg-slate-800 text-white flex flex-col">
      {puzzleToSolve && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700">
                  <h2 className="text-xl font-bold mb-4 text-amber-400">Solving: {puzzleToSolve.name}</h2>
                   {puzzleToSolve.unsolvedText && (
                      <blockquote className="mb-6 p-4 bg-slate-700/50 border-l-4 border-slate-600 text-slate-300 italic">
                          {puzzleToSolve.unsolvedText}
                      </blockquote>
                  )}
                  <p className="text-slate-400 mb-6">Enter the answer provided by the players.</p>
                  <form onSubmit={handleSubmitAnswer}>
                      <input
                          type="text"
                          value={submittedAnswer}
                          onChange={e => {
                              setSubmittedAnswer(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                              if (solveError) setSolveError(null);
                          }}
                          className="w-full px-4 py-2 font-mono tracking-widest text-lg border border-slate-600 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          autoFocus
                      />
                      {solveError && (
                          <p className="text-red-400 text-sm mt-2">{solveError}</p>
                      )}
                      <div className="mt-6 flex justify-end gap-4">
                          <button type="button" onClick={() => setPuzzleToSolve(null)} className="px-4 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Submit</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      <header className="p-4 bg-slate-900 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold">{game.title} - Presenter View</h1>
        {isPresentationWindowOpen ? (
          <span className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg cursor-not-allowed">
            <Icon as="present" className="w-5 h-5" />
            Window Open
          </span>
        ) : (
          <a href={`/game/present/${id}`}
            onClick={(e) => {
                e.preventDefault();
                
                const screenWidth = window.screen.availWidth;
                const screenHeight = window.screen.availHeight;
                const aspectRatio = 16 / 9;

                let width, height;

                if ((screenWidth / screenHeight) > aspectRatio) {
                    // Screen is wider than 16:9 (e.g., ultrawide), so height is the limiting factor.
                    height = screenHeight;
                    width = height * aspectRatio;
                } else {
                    // Screen is taller or same as 16:9, so width is the limiting factor.
                    width = screenWidth;
                    height = width / aspectRatio;
                }
                
                width = Math.floor(width);
                height = Math.floor(height);

                const left = Math.floor((window.screen.availWidth - width) / 2);
                const top = Math.floor((window.screen.availHeight - height) / 2);

                const features = `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,toolbar=no,status=no`;
                
                const win = window.open(e.currentTarget.href, 'Game', features);
                setPresentationWindow(win);
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
          >
            <Icon as="present" className="w-5 h-5" />
            Open Game Window
          </a>
        )}
      </header>
      <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Column 1: TABS (Rooms & Inventory) */}
        <div className="col-span-3 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            activeTab === 'rooms' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                        aria-pressed={activeTab === 'rooms'}
                    >
                        Rooms
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('inventory');
                            setShowInventoryNotification(false);
                        }}
                        className={`relative px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            activeTab === 'inventory' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                        aria-pressed={activeTab === 'inventory'}
                    >
                        <span>Live Inventory</span>
                        {showInventoryNotification && (
                            <span className="absolute top-1 right-2 block w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
                        )}
                    </button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-2">
                {activeTab === 'rooms' && (
                    <div className="space-y-2">
                        {game.rooms.map((room, index) => {
                            const isLocked = lockingPuzzlesByRoomId.has(room.id);
                            const lockingPuzzleName = lockingPuzzlesByRoomId.get(room.id);
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => goToRoom(index)}
                                    disabled={isLocked}
                                    title={isLocked ? `Locked by: ${lockingPuzzleName}` : ''}
                                    className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col items-start ${
                                        currentRoomIndex === index
                                            ? 'bg-brand-600 text-white font-bold shadow-lg'
                                            : 'bg-slate-700'
                                    } ${isLocked ? 'opacity-50 cursor-not-allowed hover:bg-slate-700' : 'hover:bg-slate-600'}`}
                                >
                                    <div className="w-full flex items-center justify-between">
                                        <span className="text-lg truncate">{room.name}</span>
                                        {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />}
                                    </div>
                                    {isLocked && (
                                        <span className="text-xs text-red-400 mt-1 truncate">Locked by: {lockingPuzzleName}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        {inventoryObjects.length > 0 ? (
                            <>
                                <p className="text-xs text-slate-400 italic">Toggle to move object back to room.</p>
                                {inventoryObjects.map(obj => {
                                    const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                                    return (
                                        <ObjectItem 
                                            key={obj.id} 
                                            obj={obj} 
                                            onToggle={handleToggleObject} 
                                            lockingPuzzleName={lockingPuzzle?.name} 
                                            showVisibilityToggle={true}
                                            isDescriptionVisible={visibleDescriptionIds.has(obj.id)}
                                            onToggleDescription={handleToggleDescriptionVisibility}
                                        />
                                    );
                                })}
                            </>
                        ) : (
                            <p className="text-slate-400">Inventory is empty. Toggle objects to add them.</p>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Column 2: Room Details */}
        <div className="col-span-9 bg-slate-900 rounded-lg p-6 overflow-y-auto flex flex-col">
            {currentRoom ? (
              <>
                <div className="flex-shrink-0">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300">Room Description</h2>
                    <div className="prose prose-invert prose-lg max-w-none text-slate-200">
                        {currentRoom.notes ? (
                           <MarkdownRenderer content={currentRoom.notes} />
                        ) : (
                           <span className="text-slate-400 italic">No description for this room.</span>
                        )}
                    </div>
                </div>
                
                {currentRoom.actions && currentRoom.actions.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300">
                      Actions
                    </h2>
                    <div className="space-y-4">
                      {(currentRoom.actions || []).map(action => (
                        <ActionItem 
                          key={action.id} 
                          action={action} 
                          onToggleImage={handleToggleActionImage}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {currentRoom.puzzles && currentRoom.puzzles.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-baseline gap-2">
                      <span>Puzzles</span>
                      <span className="text-xs font-normal text-slate-400">(Toggle to solve)</span>
                    </h2>
                    <div className="space-y-4">
                      {currentRoom.puzzles.map(puzzle => {
                        const lockingPuzzleName = lockingPuzzlesByPuzzleId.get(puzzle.id);
                        return (
                          <PuzzleItem 
                            key={puzzle.id} 
                            puzzle={puzzle} 
                            onToggle={handleTogglePuzzle} 
                            onAttemptSolve={handleAttemptSolve}
                            onToggleImage={handleTogglePuzzleImage}
                            isLocked={!!lockingPuzzleName}
                            lockingPuzzleName={lockingPuzzleName}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {currentRoom.objects && currentRoom.objects.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-baseline gap-2">
                      <span>Available Objects</span>
                      <span className="text-xs font-normal text-slate-400">(Toggle to add to inventory)</span>
                    </h2>
                    <div className="space-y-4">
                      {availableObjects.length > 0 ? (
                        availableObjects.map(obj => {
                            const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                            return <ObjectItem key={obj.id} obj={obj} onToggle={handleToggleObject} lockingPuzzleName={lockingPuzzle?.name} />;
                        })
                      ) : (
                         <p className="text-slate-400">All objects from this room are in the inventory.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
                 <p className="text-slate-400">Select a room to see details.</p>
            )}
        </div>
      </main>
    </div>
  );
};

export default PresenterView;