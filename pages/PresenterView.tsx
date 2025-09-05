import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Puzzle } from '../types';
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
  const [solvedPuzzleInfo, setSolvedPuzzleInfo] = useState<Puzzle | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [solveError, setSolveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'inventory'>('rooms');
  const [showInventoryNotification, setShowInventoryNotification] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState<'open' | 'complete'>('open');
  const [activePuzzleTab, setActivePuzzleTab] = useState<'open' | 'complete'>('open');
  const [selectedAct, setSelectedAct] = useState(1);
  
  const { 
    lockingPuzzlesByRoomId, 
    lockingPuzzlesByPuzzleId,
    lockingPuzzlesByRoomSolveId,
    allUnsolvedPuzzles, 
    inventoryObjects 
  } = usePresenterState(game);

  const prevInventoryCountRef = useRef(inventoryObjects.length);
  
  useEffect(() => {
    // If an item was added and the inventory tab is not active, show notification.
    if (inventoryObjects.length > prevInventoryCountRef.current && activeTab !== 'inventory') {
        setShowInventoryNotification(true);
    }
    // Update the ref to the current count for the next render.
    prevInventoryCountRef.current = inventoryObjects.length;
  }, [inventoryObjects.length, activeTab]);

  // This effect handles making new items' descriptions visible by default.
  const inventoryObjectIds = useMemo(() => new Set(inventoryObjects.map(o => o.id)), [inventoryObjects]);
  const prevInventoryObjectIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
      // Determine which IDs are new since the last render.
      const newIds = [...inventoryObjectIds].filter(id => !prevInventoryObjectIdsRef.current.has(id));
      
      // If there are new items, add them to the visible set.
      if (newIds.length > 0) {
          setVisibleDescriptionIds(currentVisible => {
              const newSet = new Set(currentVisible);
              newIds.forEach(id => newSet.add(id));
              return newSet;
          });
      }
      
      // Update the ref for the next render.
      prevInventoryObjectIdsRef.current = inventoryObjectIds;
  }, [inventoryObjectIds]);

  const handleToggleAllInventoryDescriptions = useCallback(() => {
      const allIds = inventoryObjects.map(obj => obj.id);
      // Determine if the action should be to show all or hide all
      const shouldShowAll = allIds.some(id => !visibleDescriptionIds.has(id));

      if (shouldShowAll) {
           // Show them all by adding all inventory IDs to the existing set
          setVisibleDescriptionIds(currentVisible => new Set([...currentVisible, ...allIds]));
      } else {
          // Hide them all by removing inventory IDs from the existing set
          setVisibleDescriptionIds(currentVisible => {
              const newVisible = new Set(currentVisible);
              allIds.forEach(id => newVisible.delete(id));
              return newVisible;
          });
      }
  }, [inventoryObjects, visibleDescriptionIds]);

  const areAllDescriptionsVisible = useMemo(() => {
      if (inventoryObjects.length === 0) return false;
      const allIds = inventoryObjects.map(obj => obj.id);
      return allIds.every(id => visibleDescriptionIds.has(id));
  }, [inventoryObjects, visibleDescriptionIds]);


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

      const destinationRoom = game.rooms[index];
      const newRoomId = destinationRoom.id;
      const objectsToRemove = destinationRoom.objectRemoveIds || [];

      let needsUpdate = false;
      let updatedGame = { ...game };

      // 1. Handle object removal if any are specified for the destination room
      if (objectsToRemove.length > 0) {
        let objectsWereRemoved = false;
        const currentInventoryIds = new Set(
            updatedGame.rooms.flatMap(r => r.objects).filter(o => o.showInInventory).map(o => o.id)
        );

        const idsToRemoveFromInventory = objectsToRemove.filter(id => currentInventoryIds.has(id));

        if (idsToRemoveFromInventory.length > 0) {
            updatedGame.rooms = updatedGame.rooms.map(room => ({
                ...room,
                objects: room.objects.map(obj => 
                    idsToRemoveFromInventory.includes(obj.id) ? { ...obj, showInInventory: false } : obj
                )
            }));
            objectsWereRemoved = true;
        }
        
        if (objectsWereRemoved) {
          needsUpdate = true;
        }
      }

      // 2. Handle visiting the new room (adding to visited list)
      if (!game.visitedRoomIds.includes(newRoomId)) {
        updatedGame.visitedRoomIds = [...game.visitedRoomIds, newRoomId];
        needsUpdate = true;
      }

      // 3. If any state changed, save and broadcast the update
      if (needsUpdate) {
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

    // If we are solving a puzzle that has no answer, show the success modal.
    if (newState && !targetPuzzle.answer) {
        setSolvedPuzzleInfo(targetPuzzle);
    }

    const shouldAutoAddObjects = newState && targetPuzzle.autoAddLockedObjects;
    const objectIdsToUpdate = shouldAutoAddObjects ? targetPuzzle.lockedObjectIds : [];

    const shouldAutoSolveRooms = newState && targetPuzzle.autoSolveRooms;
    const roomIdsToAutoSolve = shouldAutoSolveRooms ? targetPuzzle.lockedRoomSolveIds : [];
    
    const updatedRooms = game.rooms.map(room => {
        let newObjects = room.objects;
        // Auto-add objects to inventory if configured
        if (room.id === targetRoomId && shouldAutoAddObjects) {
            newObjects = room.objects.map(obj => 
                objectIdsToUpdate.includes(obj.id) ? { ...obj, showInInventory: true } : obj
            );
        }

        // Update the puzzle's solved state
        const newPuzzles = room.puzzles.map(p => {
            if (p.id === puzzleId) {
                // If the puzzle is being solved, also set its showImageOverlay to false.
                return { ...p, isSolved: newState, showImageOverlay: newState ? false : p.showImageOverlay };
            }
            return p;
        });
        
        // Auto-solve rooms if configured
        let newIsSolvedState = room.isSolved;
        if (roomIdsToAutoSolve.includes(room.id)) {
            newIsSolvedState = true;
        }
        
        return { ...room, objects: newObjects, puzzles: newPuzzles, isSolved: newIsSolvedState };
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

    if (submittedAnswer === puzzleToSolve.answer) {
        handleTogglePuzzle(puzzleToSolve.id, true);
        setSolvedPuzzleInfo(puzzleToSolve);
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

  const handleToggleActionComplete = (actionId: string, newState: boolean) => {
    if (!game) return;

    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            actions: (room.actions || []).map(action =>
                action.id === actionId ? { ...action, isComplete: newState } : action
            )
        }))
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

  const handleToggleRoomSolved = (roomId: string, newState: boolean) => {
    if (!game) return;
    const updatedGame = {
        ...game,
        rooms: game.rooms.map(r => (r.id === roomId ? { ...r, isSolved: newState } : r))
    };
    updateAndBroadcast(updatedGame);
  };

  const handleRestartGame = async () => {
    if (!game) return;

    const resetGame: Game = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            isSolved: false,
            objects: room.objects.map(obj => ({
                ...obj,
                showInInventory: false,
            })),
            puzzles: room.puzzles.map(p => ({
                ...p,
                isSolved: false,
                showImageOverlay: false,
            })),
            actions: (room.actions || []).map(a => ({
                ...a,
                showImageOverlay: false,
                isComplete: false,
            })),
        })),
        visitedRoomIds: game.rooms.length > 0 ? [game.rooms[0].id] : [],
    };
    
    setCurrentRoomIndex(0);
    postMessage({ type: 'GOTO_ROOM', roomIndex: 0 });
    
    await updateAndBroadcast(resetGame);
    
    setIsResetModalOpen(false);
  };

  const roomsByAct = useMemo(() => {
    if (!game) return {};
    return game.rooms.reduce((acc, room, index) => {
        const act = room.act || 1;
        if (!acc[act]) {
            acc[act] = [];
        }
        acc[act].push({ ...room, originalIndex: index });
        return acc;
    }, {} as Record<number, (Game['rooms'][0] & { originalIndex: number })[]>);
  }, [game]);

  const availableActs = useMemo(() => {
    if (!game) return [1];
    const acts = new Set(game.rooms.map(r => r.act || 1));
    return Array.from(acts).sort((a, b) => a - b);
  }, [game]);

  useEffect(() => {
    if (game?.rooms[currentRoomIndex]) {
      const currentAct = game.rooms[currentRoomIndex].act || 1;
      if (availableActs.includes(currentAct)) {
        setSelectedAct(currentAct);
      }
    }
  }, [currentRoomIndex, game, availableActs]);

  const currentActIndex = availableActs.indexOf(selectedAct);
  const canGoToPrevAct = currentActIndex > 0;
  const canGoToNextAct = currentActIndex < availableActs.length - 1;

  const handlePrevAct = () => {
    if (canGoToPrevAct) {
      setSelectedAct(availableActs[currentActIndex - 1]);
    }
  };

  const handleNextAct = () => {
    if (canGoToNextAct) {
      setSelectedAct(availableActs[currentActIndex + 1]);
    }
  };

  if (status === 'loading') {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Loading Presenter View...</div>;
  }
  
  if (status === 'error' || !game) {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Error: Could not load game.</div>;
  }
  
  const currentRoom = game.rooms[currentRoomIndex];
  const hasSolvedState = currentRoom?.solvedImage || (currentRoom?.solvedNotes && currentRoom.solvedNotes.trim() !== '');
  const availableObjects = currentRoom?.objects.filter(o => !o.showInInventory) || [];
  
  const openActions = (currentRoom?.actions || []).filter(action => !action.isComplete);
  const completedActions = (currentRoom?.actions || []).filter(action => action.isComplete);
  const openPuzzles = (currentRoom?.puzzles || []).filter(puzzle => !puzzle.isSolved);
  const completedPuzzles = (currentRoom?.puzzles || []).filter(puzzle => puzzle.isSolved);
  const roomsForSelectedAct = roomsByAct[selectedAct] || [];
  const roomSolveIsLocked = lockingPuzzlesByRoomSolveId.has(currentRoom.id);
  const roomSolveLockingPuzzleName = lockingPuzzlesByRoomSolveId.get(currentRoom.id);

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
      {solvedPuzzleInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-600 mb-4">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-4 text-green-400">
                    {solvedPuzzleInfo.answer ? 'Correct!' : 'Complete'}
                  </h2>
                  {solvedPuzzleInfo.solvedText && (
                      <blockquote className="mb-6 p-4 bg-slate-700/50 border-l-4 border-slate-600 text-slate-300 italic text-left">
                          {solvedPuzzleInfo.solvedText}
                      </blockquote>
                  )}
                  <button 
                      type="button" 
                      onClick={() => setSolvedPuzzleInfo(null)} 
                      className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
                      Continue
                  </button>
              </div>
          </div>
      )}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700 text-center">
                <h2 className="text-2xl font-bold mb-4 text-yellow-400">Restart Game?</h2>
                <p className="text-slate-300 mb-6">
                    This will reset all puzzles, inventory, and visited rooms to their default state. This action cannot be undone.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button
                        type="button"
                        onClick={() => setIsResetModalOpen(false)}
                        className="px-6 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleRestartGame}
                        className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                        Confirm Restart
                    </button>
                </div>
            </div>
        </div>
      )}
      <header className="p-4 bg-slate-900 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold">{game.title} - Presenter View</h1>
        <div className="flex items-center gap-2">
            <button
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-300 shadow"
                title="Restart Game"
            >
                <Icon as="restart" className="w-5 h-5" />
                Restart Game
            </button>
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
        </div>
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
                    <div>
                        {availableActs.length > 1 && (
                            <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-md mb-4">
                                <button
                                    onClick={handlePrevAct}
                                    disabled={!canGoToPrevAct}
                                    className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                                    aria-label="Previous Act"
                                >
                                    <Icon as="prev" className="w-5 h-5" />
                                </button>
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                    Act {selectedAct}
                                </h3>
                                <button
                                    onClick={handleNextAct}
                                    disabled={!canGoToNextAct}
                                    className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                                    aria-label="Next Act"
                                >
                                    <Icon as="next" className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <div className="space-y-2">
                            {roomsForSelectedAct.map((room) => {
                                const index = room.originalIndex;
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
                )}
                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        {inventoryObjects.length > 0 ? (
                            <>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs text-slate-400 italic">Toggle to move object back to room.</p>
                                    <button
                                        onClick={handleToggleAllInventoryDescriptions}
                                        title={areAllDescriptionsVisible ? "Hide all descriptions" : "Show all descriptions"}
                                        aria-label={areAllDescriptionsVisible ? "Hide all descriptions" : "Show all descriptions"}
                                        className="text-slate-400 hover:text-white p-1 rounded-full"
                                    >
                                        <Icon as={areAllDescriptionsVisible ? 'eye-slash' : 'eye'} className="w-5 h-5" />
                                    </button>
                                </div>
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
        <div className="col-span-9 bg-slate-900 rounded-lg p-6 overflow-y-auto">
            {currentRoom ? (
              <>
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-300">Room Description</h2>
                        {hasSolvedState && (
                            <div title={roomSolveIsLocked ? `Locked by: ${roomSolveLockingPuzzleName}` : ''}>
                                <label className={`flex items-center gap-2 text-sm ${currentRoom.isSolved ? 'text-slate-400' : 'text-green-300'} ${roomSolveIsLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                    <span>Mark Room as Solved</span>
                                    <input
                                        type="checkbox"
                                        checked={currentRoom.isSolved}
                                        onChange={(e) => handleToggleRoomSolved(currentRoom.id, e.target.checked)}
                                        className="sr-only peer"
                                        disabled={roomSolveIsLocked}
                                    />
                                    <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                                {roomSolveIsLocked && (
                                    <p className="text-red-500 text-xs text-right mt-1">Locked by: {roomSolveLockingPuzzleName}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="prose prose-invert prose-lg max-w-none text-slate-200">
                        {currentRoom.isSolved ? (
                            currentRoom.solvedNotes ? (
                                <MarkdownRenderer content={currentRoom.solvedNotes} />
                            ) : (
                                <span className="text-slate-400 italic">No solved description for this room.</span>
                            )
                        ) : (
                            currentRoom.notes ? (
                               <MarkdownRenderer content={currentRoom.notes} />
                            ) : (
                               <span className="text-slate-400 italic">No description for this room.</span>
                            )
                        )}
                    </div>
                </div>
                
                {currentRoom.actions && currentRoom.actions.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700">
                    <div className="flex justify-between items-baseline mb-4 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-300">When players ask to...</h2>
                        <div className="flex">
                            <button
                                onClick={() => setActiveActionTab('open')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeActionTab === 'open' ? 'border-b-2 border-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Open <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{openActions.length}</span>
                            </button>
                            <button
                                onClick={() => setActiveActionTab('complete')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeActionTab === 'complete' ? 'border-b-2 border-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Complete <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{completedActions.length}</span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {activeActionTab === 'open' && (
                            openActions.length > 0 ? (
                                openActions.map(action => (
                                    <ActionItem 
                                        key={action.id} 
                                        action={action} 
                                        onToggleImage={handleToggleActionImage}
                                        onToggleComplete={handleToggleActionComplete}
                                    />
                                ))
                            ) : (
                                <p className="text-slate-400 italic text-sm p-4">No open actions in this room.</p>
                            )
                        )}
                        {activeActionTab === 'complete' && (
                            completedActions.length > 0 ? (
                                completedActions.map(action => (
                                    <ActionItem 
                                        key={action.id} 
                                        action={action} 
                                        onToggleImage={handleToggleActionImage}
                                        onToggleComplete={handleToggleActionComplete}
                                    />
                                ))
                            ) : (
                                <p className="text-slate-400 italic text-sm p-4">No completed actions in this room.</p>
                            )
                        )}
                    </div>
                  </div>
                )}
                
                {currentRoom.puzzles && currentRoom.puzzles.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700">
                    <div className="flex justify-between items-baseline mb-4 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-300">Puzzles</h2>
                        <div className="flex">
                            <button
                                onClick={() => setActivePuzzleTab('open')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activePuzzleTab === 'open' ? 'border-b-2 border-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Open <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{openPuzzles.length}</span>
                            </button>
                            <button
                                onClick={() => setActivePuzzleTab('complete')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activePuzzleTab === 'complete' ? 'border-b-2 border-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Complete <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{completedPuzzles.length}</span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {activePuzzleTab === 'open' && (
                             openPuzzles.length > 0 ? (
                                openPuzzles.map(puzzle => {
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
                                })
                             ) : (
                                 <p className="text-slate-400 italic text-sm p-4">No open puzzles in this room.</p>
                             )
                        )}
                        {activePuzzleTab === 'complete' && (
                            completedPuzzles.length > 0 ? (
                                completedPuzzles.map(puzzle => (
                                    <PuzzleItem 
                                        key={puzzle.id} 
                                        puzzle={puzzle} 
                                        onToggle={handleTogglePuzzle} 
                                        onAttemptSolve={handleAttemptSolve}
                                        onToggleImage={handleTogglePuzzleImage}
                                        isLocked={false} // Completed puzzles aren't locked
                                    />
                                ))
                            ) : (
                                <p className="text-slate-400 italic text-sm p-4">No completed puzzles in this room.</p>
                            )
                        )}
                    </div>
                  </div>
                )}
                
                {currentRoom.objects && currentRoom.objects.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-700">
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