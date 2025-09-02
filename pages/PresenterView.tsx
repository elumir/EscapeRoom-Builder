import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as presentationService from '../services/presentationService';
import type { Presentation, Room as RoomType, Puzzle } from '../types';
import Icon from '../components/Icon';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import ObjectItem from '../components/presenter/ObjectItem';
import PuzzleItem from '../components/presenter/PuzzleItem';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_UPDATE';
  roomIndex?: number;
}

type Status = 'loading' | 'success' | 'error';

const PresenterView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [presentationWindow, setPresentationWindow] = useState<Window | null>(null);
  const [visibleDescriptionIds, setVisibleDescriptionIds] = useState<Set<string>>(new Set());

  const isPresentationWindowOpen = presentationWindow && !presentationWindow.closed;

  const channelName = `presentation-${id}`;
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
      const data = await presentationService.getPresentation(id);
      if (data) {
        if (data.rooms.length > 0 && data.visitedRoomIds.length === 0) {
          // On first load, mark the initial room as visited
          const initialVisited: Presentation = {
            ...data,
            visitedRoomIds: [data.rooms[0].id],
          };
          setPresentation(initialVisited);
          await presentationService.savePresentation(initialVisited);
        } else {
          setPresentation(data);
        }
        setStatus('success');
      } else {
        setStatus('error');
      }
    };
    fetchAndInitialize();

    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'presentations' && id) {
        const data = await presentationService.getPresentation(id);
        if (data) {
          setPresentation(data);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [id]);

  const updateAndBroadcast = useCallback(async (updatedPresentation: Presentation) => {
    setPresentation(updatedPresentation);
    try {
        await presentationService.savePresentation(updatedPresentation);
        postMessage({ type: 'STATE_UPDATE' });
    } catch (error) {
        console.error("Failed to save presentation state:", error);
        alert("A change could not be saved. Please check your connection.");
    }
  }, [postMessage]);

  const goToRoom = useCallback((index: number) => {
    if (!presentation) return;
    if (index >= 0 && index < presentation.rooms.length) {
      setCurrentRoomIndex(index);
      postMessage({ type: 'GOTO_ROOM', roomIndex: index });

      const newRoomId = presentation.rooms[index].id;
      if (!presentation.visitedRoomIds.includes(newRoomId)) {
        const updatedPresentation = {
          ...presentation,
          visitedRoomIds: [...presentation.visitedRoomIds, newRoomId],
        };
        updateAndBroadcast(updatedPresentation);
      }
    }
  }, [presentation, postMessage, updateAndBroadcast]);


  const handleToggleObject = (objectId: string, newState: boolean) => {
    if (!presentation) return;

    const updatedPresentation = {
        ...presentation,
        rooms: presentation.rooms.map(room => ({
            ...room,
            objects: room.objects.map(obj =>
                obj.id === objectId ? { ...obj, showInInventory: newState } : obj
            )
        }))
    };
    updateAndBroadcast(updatedPresentation);
  };

  const handleTogglePuzzle = (puzzleId: string, newState: boolean) => {
    if (!presentation) return;

    let targetPuzzle: Puzzle | null = null;
    let targetRoomId: string | null = null;
    for (const room of presentation.rooms) {
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
    
    const updatedRooms = presentation.rooms.map(room => {
        let newObjects = room.objects;
        if (room.id === targetRoomId && shouldAutoAdd) {
            newObjects = room.objects.map(obj => 
                objectIdsToUpdate.includes(obj.id) ? { ...obj, showInInventory: true } : obj
            );
        }

        const newPuzzles = room.puzzles.map(p => 
            p.id === puzzleId ? { ...p, isSolved: newState } : p
        );
        
        return { ...room, objects: newObjects, puzzles: newPuzzles };
    });
    
    const updatedPresentation = { ...presentation, rooms: updatedRooms };
    updateAndBroadcast(updatedPresentation);
  };
  
  const handleTogglePuzzleImage = (puzzleId: string, newState: boolean) => {
    if (!presentation || !presentation.rooms[currentRoomIndex]) return;
    const currentRoomId = presentation.rooms[currentRoomIndex].id;

    const updatedPresentation = {
        ...presentation,
        rooms: presentation.rooms.map(room => {
            if (room.id !== currentRoomId) return room;
            return {
                ...room,
                puzzles: room.puzzles.map(p => {
                    if (p.id === puzzleId) return { ...p, showImageOverlay: newState };
                    // If turning one on, turn others in the same room off.
                    if (newState) return { ...p, showImageOverlay: false };
                    return p;
                })
            };
        })
    };
    updateAndBroadcast(updatedPresentation);
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
  
  if (status === 'error' || !presentation) {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Error: Could not load presentation.</div>;
  }
  
  const allUnsolvedPuzzles = presentation.rooms.flatMap(r => r.puzzles).filter(p => !p.isSolved);
  
  const lockingPuzzlesByRoomId = new Map<string, string>();
  const lockingPuzzlesByPuzzleId = new Map<string, string>();

  allUnsolvedPuzzles.forEach(puzzle => {
      (puzzle.lockedRoomIds || []).forEach(roomId => {
          if (!lockingPuzzlesByRoomId.has(roomId)) {
              lockingPuzzlesByRoomId.set(roomId, puzzle.name);
          }
      });
      (puzzle.lockedPuzzleIds || []).forEach(puzzleId => {
          if (!lockingPuzzlesByPuzzleId.has(puzzleId)) {
              lockingPuzzlesByPuzzleId.set(puzzleId, puzzle.name);
          }
      });
  });
  
  const currentRoom = presentation.rooms[currentRoomIndex];
  const inventoryObjects = presentation.rooms.flatMap(r => r.objects).filter(o => o.showInInventory);
  const availableObjects = currentRoom?.objects.filter(o => !o.showInInventory) || [];

  return (
    <div className="h-screen bg-slate-800 text-white flex flex-col">
      <header className="p-4 bg-slate-900 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold">{presentation.title} - Presenter View</h1>
        {isPresentationWindowOpen ? (
          <span className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg cursor-not-allowed">
            <Icon as="present" className="w-5 h-5" />
            Window Open
          </span>
        ) : (
          <a href={`#/present/${id}`}
            onClick={(e) => {
                e.preventDefault();
                const win = window.open(e.currentTarget.href, 'Presentation', 'width=800,height=600');
                setPresentationWindow(win);
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
          >
            <Icon as="present" className="w-5 h-5" />
            Open Presentation Window
          </a>
        )}
      </header>
      <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Column 1: Room Navigation */}
        <div className="col-span-3 overflow-y-auto pr-2">
            <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-800 py-2">Rooms</h2>
            <div className="space-y-2">
                {presentation.rooms.map((room, index) => {
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
        </div>

        {/* Column 2: Room Details (Notes & Available Objects) */}
        <div className="col-span-5 bg-slate-900 rounded-lg p-6 overflow-y-auto flex flex-col">
            {currentRoom ? (
              <>
                <div className="flex-shrink-0">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900 py-2">Room Description</h2>
                    <div className="prose prose-invert prose-lg max-w-none whitespace-pre-wrap text-slate-200">
                        {currentRoom.notes || <span className="text-slate-400">No description for this room.</span>}
                    </div>
                </div>
                
                {currentRoom.puzzles && currentRoom.puzzles.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900 py-2 flex items-baseline gap-2">
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
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900 py-2 flex items-baseline gap-2">
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
        
        {/* Column 3: Live Inventory */}
        <div className="col-span-4 bg-slate-900/50 rounded-lg p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900/50 backdrop-blur-sm py-2">Live Inventory</h2>
            <div className="space-y-4">
                {inventoryObjects.length > 0 ? (
                    inventoryObjects.map(obj => {
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
                    })
                ) : (
                    <p className="text-slate-400">Inventory is empty. Toggle objects to add them.</p>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default PresenterView;
