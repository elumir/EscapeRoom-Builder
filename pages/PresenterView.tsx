import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import { API_BASE_URL } from '../services/presentationService';
import type { Game, Puzzle, InventoryObject } from '../types';
import Icon from '../components/Icon';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import ObjectItem from '../components/presenter/ObjectItem';
import PuzzleItem from '../components/presenter/PuzzleItem';
import ActionItem from '../components/presenter/ActionItem';
import { usePresenterState } from '../hooks/usePresenterState';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { generateUUID } from '../utils/uuid';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_SYNC';
  roomIndex?: number;
  game?: Game;
  customItems?: InventoryObject[];
}

type Status = 'loading' | 'success' | 'error';

// Helper to shuffle an array
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

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
  const [activeTab, setActiveTab] = useState<'rooms' | 'inventory' | 'discarded'>('rooms');
  const [showInventoryNotification, setShowInventoryNotification] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState<'open' | 'complete'>('open');
  const [activePuzzleTab, setActivePuzzleTab] = useState<'open' | 'complete'>('open');
  const [selectedAct, setSelectedAct] = useState(1);
  const [objectRemoveModalText, setObjectRemoveModalText] = useState<string | null>(null);
  const [customItems, setCustomItems] = useState<InventoryObject[]>([]);
  
  const { 
    lockingPuzzlesByRoomId, 
    lockingPuzzlesByPuzzleId,
    lockingPuzzlesByRoomSolveId,
    lockingPuzzlesByActionId,
    lockingPuzzlesByObjectId,
    lockingPuzzlesByActNumber,
    inventoryObjects,
    discardedObjects,
  } = usePresenterState(game);
  
  // Soundtrack State
  const [soundtrack, setSoundtrack] = useState<{
    elements: HTMLAudioElement[];
    trackOrder: number[];
    currentTrackIndex: number;
    isPlaying: boolean;
    volume: number;
    mode: 'sequential' | 'shuffle';
  } | null>(null);
  const soundtrackRef = useRef(soundtrack);
  useEffect(() => { soundtrackRef.current = soundtrack; }, [soundtrack]);

  const playNextTrack = useCallback(() => {
    const currentSoundtrack = soundtrackRef.current;
    // Only proceed if we're currently playing. This prevents auto-play when a track ends while paused.
    if (!currentSoundtrack || !currentSoundtrack.isPlaying) return;

    const { elements, trackOrder, currentTrackIndex } = currentSoundtrack;
    if (elements.length === 0) return;
    
    const currentPositionInOrder = trackOrder.indexOf(currentTrackIndex);
    const nextPositionInOrder = (currentPositionInOrder + 1) % trackOrder.length;
    const nextTrackIndex = trackOrder[nextPositionInOrder];
    
    elements[currentTrackIndex].currentTime = 0; // Reset just-ended track
    
    const nextElement = elements[nextTrackIndex];
    if (nextElement) {
        nextElement.currentTime = 0;
        nextElement.play().catch(e => console.error("Autoplay failed for next track:", e));
    }

    setSoundtrack(prev => prev ? { ...prev, currentTrackIndex: nextTrackIndex } : null);
  }, []);

  useEffect(() => {
    // Clean up previous soundtrack elements and listeners if the game object changes
    const previousElements = soundtrackRef.current?.elements;

    // Initialize new soundtrack
    if (game?.soundtrack && game.soundtrack.length > 0) {
      const mode = game.soundtrackMode ?? 'sequential';
      const volume = game.soundtrackVolume ?? 0.5;
      
      const elements = game.soundtrack.map(track => {
        const audio = new Audio(`${API_BASE_URL}/assets/${track.id}`);
        audio.volume = volume;
        return audio;
      });
      
      elements.forEach(el => { el.onended = playNextTrack; });
      
      const indices = Array.from(Array(elements.length).keys());
      const trackOrder = mode === 'shuffle' ? shuffleArray(indices) : indices;

      setSoundtrack({
        elements,
        trackOrder,
        currentTrackIndex: trackOrder.length > 0 ? trackOrder[0] : 0,
        isPlaying: false,
        volume: volume,
        mode: mode,
      });
    } else {
      setSoundtrack(null);
    }

    return () => {
      previousElements?.forEach(el => {
        el.pause();
        el.onended = null;
        el.src = ''; // Release resource
      });
    };
  }, [game, playNextTrack]);

  // Effect to handle play/pause state changes
  useEffect(() => {
      if (!soundtrack) return;
      const { elements, currentTrackIndex, isPlaying } = soundtrack;
      const currentElement = elements[currentTrackIndex];
      if (currentElement) {
          if (isPlaying) {
              currentElement.play().catch(e => console.error("Playback failed:", e));
          } else {
              currentElement.pause();
          }
      }
  }, [soundtrack?.isPlaying, soundtrack?.currentTrackIndex]);


  const handleAddCustomItem = () => {
    const name = window.prompt("Enter the name for the new custom item:");
    if (name && name.trim()) {
      const newItem: InventoryObject = {
        id: `custom-${generateUUID()}`,
        name: name.trim(),
        description: '', // Custom items have no description
        showInInventory: true,
        wasEverInInventory: true,
        addedToInventoryTimestamp: Date.now(),
        image: null,
        showImageOverlay: false,
      };
      setCustomItems(prev => [newItem, ...prev]);
    }
  };

  const handleToggleCustomItem = (itemId: string, newState: boolean) => {
    setCustomItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, showInInventory: newState } 
        : item
    ));
  };

  const combinedInventoryObjects = useMemo(() => {
    const customInventory = customItems.filter(item => item.showInInventory);
    return [...customInventory, ...inventoryObjects]
      .sort((a, b) => (b.addedToInventoryTimestamp || 0) - (a.addedToInventoryTimestamp || 0));
  }, [customItems, inventoryObjects]);

  const combinedDiscardedObjects = useMemo(() => {
    const customDiscarded = customItems.filter(item => !item.showInInventory && item.wasEverInInventory);
    return [...customDiscarded, ...discardedObjects]
      .sort((a, b) => (b.addedToInventoryTimestamp || 0) - (a.addedToInventoryTimestamp || 0));
  }, [customItems, discardedObjects]);

  const prevInventoryCountRef = useRef(combinedInventoryObjects.length);
  
  useEffect(() => {
    // If an item was added and the inventory tab is not active, show notification.
    if (combinedInventoryObjects.length > prevInventoryCountRef.current && activeTab !== 'inventory') {
        setShowInventoryNotification(true);
    }
    prevInventoryCountRef.current = combinedInventoryObjects.length;
  }, [combinedInventoryObjects.length, activeTab]);

  // This effect handles making new items' descriptions visible by default.
  const inventoryObjectIds = useMemo(() => new Set(combinedInventoryObjects.map(o => o.id)), [combinedInventoryObjects]);
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
      const allIds = combinedInventoryObjects.map(obj => obj.id);
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
  }, [combinedInventoryObjects, visibleDescriptionIds]);

  const areAllDescriptionsVisible = useMemo(() => {
      if (combinedInventoryObjects.length === 0) return false;
      const allIds = combinedInventoryObjects.map(obj => obj.id);
      return allIds.every(id => visibleDescriptionIds.has(id));
  }, [combinedInventoryObjects, visibleDescriptionIds]);


  const isPresentationWindowOpen = presentationWindow && !presentationWindow.closed;

  const channelName = `game-${id}`;
  const postMessage = useBroadcastChannel<BroadcastMessage>(channelName, () => {});

  useEffect(() => {
    if (game) {
      postMessage({ type: 'STATE_SYNC', game, customItems });
    }
  }, [customItems, postMessage, game]);

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
      // Use the new service function that can fetch public or private games
      const data = await gameService.getGameForPresentation(id);
      if (data) {
        if (data.rooms.length > 0 && data.visitedRoomIds.length === 0) {
          // On first load, mark the initial room as visited
          const initialVisited: Game = {
            ...data,
            visitedRoomIds: [data.rooms[0].id],
          };
          setGame(initialVisited);
          await gameService.saveGame(initialVisited).catch(err => {
            console.warn("Could not save initial visited room state. This is expected for public games.", err.message);
          });
        } else {
          setGame(data);
        }
        setStatus('success');
      } else {
        setStatus('error');
      }
    };
    fetchAndInitialize();
  }, [id]);

  const updateAndBroadcast = useCallback(async (updatedGame: Game) => {
    setGame(updatedGame);
    // Optimistically broadcast the new state immediately.
    postMessage({ type: 'STATE_SYNC', game: updatedGame, customItems });

    try {
        await gameService.saveGame(updatedGame);
    } catch (error) {
        console.error("Failed to save game state:", error);
        if (game?.visibility !== 'public') {
           alert("A change could not be saved. Please check your connection.");
        } else {
            console.warn("Presenter is not the owner; state changes are local to this session.");
        }
    }
  }, [postMessage, customItems, game?.visibility]);

  const goToRoom = useCallback((index: number) => {
    if (!game || index === currentRoomIndex) return;

    if (index >= 0 && index < game.rooms.length) {
      setCurrentRoomIndex(index);
      setActiveActionTab('open');
      setActivePuzzleTab('open');
      postMessage({ type: 'GOTO_ROOM', roomIndex: index, customItems });

      const destinationRoom = game.rooms[index];
      const newRoomId = destinationRoom.id;
      const objectsToRemove = destinationRoom.objectRemoveIds || [];

      let needsUpdate = false;
      let updatedGame = { ...game };

      // Reset all image overlays when changing rooms.
      let overlaysWereReset = false;
      updatedGame.rooms = updatedGame.rooms.map(room => {
          const hasActiveOverlay = 
            room.objects.some(o => o.showImageOverlay) ||
            room.puzzles.some(p => p.showImageOverlay) ||
            (room.actions || []).some(a => a.showImageOverlay);

          if (hasActiveOverlay) {
              overlaysWereReset = true;
              return {
                  ...room,
                  objects: room.objects.map(o => o.showImageOverlay ? { ...o, showImageOverlay: false } : o),
                  puzzles: room.puzzles.map(p => p.showImageOverlay ? { ...p, showImageOverlay: false } : p),
                  actions: (room.actions || []).map(a => a.showImageOverlay ? { ...a, showImageOverlay: false } : a),
              };
          }
          return room;
      });
      
      if(overlaysWereReset) {
          needsUpdate = true;
      }

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
            if (destinationRoom.objectRemoveText && destinationRoom.objectRemoveText.trim()) {
                setObjectRemoveModalText(destinationRoom.objectRemoveText);
            }
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
  }, [game, postMessage, updateAndBroadcast, customItems, currentRoomIndex]);


  const handleToggleObject = (objectId: string, newState: boolean) => {
    if (!game) return;

    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            objects: room.objects.map(obj => {
                if (obj.id === objectId) {
                    const newObj = { ...obj, showInInventory: newState };
                    if (newState && !obj.wasEverInInventory) {
                        newObj.wasEverInInventory = true;
                    }
                    if (newState) {
                        newObj.addedToInventoryTimestamp = Date.now();
                    }
                    return newObj;
                }
                return obj;
            })
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
    
    const objectIdsToDiscard = newState ? (targetPuzzle.discardObjectIds || []) : [];
    const roomIdsToAutoSolve = newState ? (targetPuzzle.lockedRoomSolveIds || []) : [];
    const actionIdsToComplete = newState ? (targetPuzzle.completedActionIds || []) : [];

    const updatedRooms = game.rooms.map(room => {
        let newObjects = room.objects;
        // Auto-add objects to inventory if configured
        if (shouldAutoAddObjects) {
            newObjects = newObjects.map(obj => {
                if (objectIdsToUpdate.includes(obj.id)) {
                    return { 
                      ...obj, 
                      showInInventory: true, 
                      wasEverInInventory: true,
                      addedToInventoryTimestamp: Date.now(),
                    };
                }
                return obj;
            });
        }
        
        // Auto-discard objects if configured
        if (objectIdsToDiscard.length > 0) {
            newObjects = newObjects.map(obj => {
                if (objectIdsToDiscard.includes(obj.id)) {
                    return { ...obj, showInInventory: false };
                }
                return obj;
            });
        }
        
        // Auto-complete actions if configured
        let newActions = room.actions || [];
        if (actionIdsToComplete.length > 0 && newActions.length > 0) {
            newActions = newActions.map(action => {
                if (actionIdsToComplete.includes(action.id)) {
                    return { ...action, isComplete: true, showImageOverlay: false };
                }
                return action;
            });
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
        
        return { ...room, objects: newObjects, puzzles: newPuzzles, actions: newActions, isSolved: newIsSolvedState };
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
            const newActions = (room.actions || []).map(a => ({ ...a, showImageOverlay: false }));
            const newObjects = room.objects.map(o => ({ ...o, showImageOverlay: false }));
            
            if (room.id !== currentRoomId) {
                return { ...room, actions: newActions, objects: newObjects };
            }
            
            const newPuzzles = room.puzzles.map(p => {
                if (p.id === puzzleId) return { ...p, showImageOverlay: newState };
                if (newState) return { ...p, showImageOverlay: false };
                return p;
            });
            
            return {
                ...room,
                puzzles: newPuzzles,
                actions: newActions,
                objects: newObjects
            };
        })
    };
    updateAndBroadcast(updatedGame);
  };

  const handleToggleActionImage = (actionId: string, newState: boolean) => {
    if (!game || !game.rooms[currentRoomIndex]) return;
    
    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => {
            const newPuzzles = room.puzzles.map(p => ({ ...p, showImageOverlay: false }));
            const newObjects = room.objects.map(o => ({ ...o, showImageOverlay: false }));
            const newActions = (room.actions || []).map(a => {
                if (a.id === actionId) return { ...a, showImageOverlay: newState };
                if (newState) return { ...a, showImageOverlay: false };
                return a;
            });

            return {
                ...room,
                puzzles: newPuzzles,
                actions: newActions,
                objects: newObjects,
            };
        })
    };
    updateAndBroadcast(updatedGame);
  };

  const handleToggleObjectImage = (objectId: string, newState: boolean) => {
    if (!game) return;

    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            puzzles: room.puzzles.map(p => ({ ...p, showImageOverlay: false })),
            actions: (room.actions || []).map(a => ({ ...a, showImageOverlay: false })),
            objects: room.objects.map(obj => {
                if (obj.id === objectId) return { ...obj, showImageOverlay: newState };
                if (newState) return { ...obj, showImageOverlay: false };
                return obj;
            })
        }))
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
                wasEverInInventory: false,
                showImageOverlay: false,
                addedToInventoryTimestamp: undefined,
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
    
    setCustomItems([]); // Also clear custom items on reset
    setCurrentRoomIndex(0);
    postMessage({ type: 'GOTO_ROOM', roomIndex: 0 });
    
    await updateAndBroadcast(resetGame);
    
    setIsResetModalOpen(false);
  };
  
  const handleOpenGameWindow = () => {
    if (!id) return;
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    const aspectRatio = 16 / 9;

    let width, height;

    if ((screenWidth / screenHeight) > aspectRatio) {
      // Screen is wider than 16:9, so height is the limiting factor.
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
    
    const gameUrl = `/game/present/${id}`;
    
    const win = window.open(gameUrl, 'Game', features);
    setPresentationWindow(win);
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

  const prevActNumber = availableActs[currentActIndex - 1];
  const isPrevActLocked = lockingPuzzlesByActNumber.has(prevActNumber);
  const prevActLockingPuzzleName = lockingPuzzlesByActNumber.get(prevActNumber);
  const canGoToPrevAct = currentActIndex > 0 && !isPrevActLocked;
  
  const nextActNumber = availableActs[currentActIndex + 1];
  const isNextActLocked = lockingPuzzlesByActNumber.has(nextActNumber);
  const nextActLockingPuzzleName = lockingPuzzlesByActNumber.get(nextActNumber);
  const canGoToNextAct = currentActIndex < availableActs.length - 1 && !isNextActLocked;

  const handlePrevAct = () => {
    if (canGoToPrevAct) {
      const newAct = availableActs[currentActIndex - 1];
      setSelectedAct(newAct);
      const roomsForNewAct = roomsByAct[newAct];
      if (roomsForNewAct && roomsForNewAct.length > 0) {
        goToRoom(roomsForNewAct[0].originalIndex);
      }
    }
  };

  const handleNextAct = () => {
    if (canGoToNextAct) {
      const newAct = availableActs[currentActIndex + 1];
      setSelectedAct(newAct);
      const roomsForNewAct = roomsByAct[newAct];
      if (roomsForNewAct && roomsForNewAct.length > 0) {
        goToRoom(roomsForNewAct[0].originalIndex);
      }
    }
  };
  
  // --- Soundtrack Handlers ---
  const handleSoundtrackPlayPause = () => {
    if (!soundtrack) return;
    setSoundtrack({ ...soundtrack, isPlaying: !soundtrack.isPlaying });
  };

  const handleSoundtrackNext = () => {
      if (!soundtrack || soundtrack.elements.length < 2) return;
      const { elements, trackOrder, currentTrackIndex, isPlaying } = soundtrack;
      elements[currentTrackIndex].pause();
      elements[currentTrackIndex].currentTime = 0;
      
      const currentPosition = trackOrder.indexOf(currentTrackIndex);
      const nextPosition = (currentPosition + 1) % trackOrder.length;
      const nextTrackIndex = trackOrder[nextPosition];
      
      if (isPlaying) {
          elements[nextTrackIndex].currentTime = 0;
          elements[nextTrackIndex].play().catch(e => console.error("Playback failed:", e));
      }
      setSoundtrack({ ...soundtrack, currentTrackIndex: nextTrackIndex });
  };
  
  const handleSoundtrackPrev = () => {
      if (!soundtrack || soundtrack.elements.length < 2) return;
      const { elements, trackOrder, currentTrackIndex, isPlaying } = soundtrack;
      elements[currentTrackIndex].pause();
      elements[currentTrackIndex].currentTime = 0;

      const currentPosition = trackOrder.indexOf(currentTrackIndex);
      const prevPosition = (currentPosition - 1 + trackOrder.length) % trackOrder.length;
      const prevTrackIndex = trackOrder[prevPosition];

      if (isPlaying) {
          elements[prevTrackIndex].currentTime = 0;
          elements[prevTrackIndex].play().catch(e => console.error("Playback failed:", e));
      }
      setSoundtrack({ ...soundtrack, currentTrackIndex: prevTrackIndex });
  };
  
  const handleSoundtrackVolumeChange = (newVolume: number) => {
    if (!soundtrack) return;
    soundtrack.elements.forEach(el => el.volume = newVolume);
    setSoundtrack({ ...soundtrack, volume: newVolume });
  };

  if (status === 'loading') {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Loading Presenter View...</div>;
  }
  
  if (status === 'error' || !game) {
    return <div className="h-screen bg-slate-800 text-white flex items-center justify-center">Error: Could not load game. It may be private or does not exist.</div>;
  }
  
  const currentRoom = game.rooms[currentRoomIndex];
  const hasSolvedState = currentRoom?.solvedImage || (currentRoom?.solvedNotes && currentRoom.solvedNotes.trim() !== '');
  
  // Filter out locked items
  const availableObjects = (currentRoom?.objects || []).filter(o => 
    !o.showInInventory && 
    !o.wasEverInInventory &&
    !lockingPuzzlesByObjectId.has(o.id)
  );
  
  const openActions = (currentRoom?.actions || []).filter(action => 
    !action.isComplete && 
    !lockingPuzzlesByActionId.has(action.id)
  );
  const completedActions = (currentRoom?.actions || []).filter(action => action.isComplete);
  
  const openPuzzles = (currentRoom?.puzzles || []).filter(puzzle => 
    !puzzle.isSolved && 
    !lockingPuzzlesByPuzzleId.has(puzzle.id)
  );
  const completedPuzzles = (currentRoom?.puzzles || []).filter(puzzle => puzzle.isSolved);

  const roomsForSelectedAct = roomsByAct[selectedAct] || [];
  const roomSolveIsLocked = lockingPuzzlesByRoomSolveId.has(currentRoom.id);
  const roomSolveLockingPuzzleName = lockingPuzzlesByRoomSolveId.get(currentRoom.id);

  return (
    <div className="h-screen bg-slate-800 text-white flex flex-col">
      {objectRemoveModalText && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-sky-600 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-4 text-sky-400">Object(s) Removed</h2>
                  <blockquote className="mb-6 p-4 bg-slate-700/50 border-l-4 border-slate-600 text-slate-300 italic text-left whitespace-pre-wrap">
                      {objectRemoveModalText}
                  </blockquote>
                  <button 
                      type="button" 
                      onClick={() => setObjectRemoveModalText(null)} 
                      className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
                      Continue
                  </button>
              </div>
          </div>
      )}
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
        <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{game.title} - Presenter View</h1>
        </div>
        {soundtrack && (
            <div className="flex items-center gap-2 px-4">
                <Icon as={soundtrack.mode === 'shuffle' ? 'shuffle' : 'audio'} className="w-5 h-5 text-slate-400 flex-shrink-0"/>
                <p className="text-sm text-slate-300 truncate max-w-xs">{game.soundtrack?.[soundtrack.currentTrackIndex]?.name || 'Soundtrack'}</p>
                <button onClick={handleSoundtrackPrev} className="p-2 text-slate-300 hover:text-white"><Icon as="prev" className="w-4 h-4"/></button>
                <button onClick={handleSoundtrackPlayPause} className="p-2 text-slate-300 hover:text-white">
                    {soundtrack.isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 3.5A1.5 1.5 0 017 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM12.5 3.5A1.5 1.5 0 0114 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                    )}
                </button>
                <button onClick={handleSoundtrackNext} className="p-2 text-slate-300 hover:text-white"><Icon as="next" className="w-4 h-4"/></button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundtrack.volume}
                    onChange={e => handleSoundtrackVolumeChange(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full"
                />
            </div>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-300 shadow"
                title="Restart Game"
            >
                <Icon as="restart" className="w-5 h-5" />
                <span className="hidden lg:inline">Restart Game</span>
            </button>
            {isPresentationWindowOpen ? (
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg cursor-not-allowed">
                <Icon as="present" className="w-5 h-5" />
                <span className="hidden lg:inline">Window Open</span>
            </button>
            ) : (
            <button
                onClick={handleOpenGameWindow}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
            >
                <Icon as="present" className="w-5 h-5" />
                <span className="hidden lg:inline">Open Window</span>
            </button>
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
                        <span>Inventory</span>
                        {showInventoryNotification && (
                            <span className="absolute top-1 right-2 block w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
                        )}
                    </button>
                     <button
                        onClick={() => setActiveTab('discarded')}
                        className={`relative px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            activeTab === 'discarded' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                        aria-pressed={activeTab === 'discarded'}
                    >
                        <span>Discarded</span>
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
                                    title={!canGoToPrevAct && isPrevActLocked ? `Locked by: ${prevActLockingPuzzleName}` : "Previous Act"}
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
                                    title={!canGoToNextAct && isNextActLocked ? `Locked by: ${nextActLockingPuzzleName}` : "Next Act"}
                                >
                                    <Icon as="next" className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <div className="space-y-2">
                            {roomsForSelectedAct
                                .map((room) => {
                                const index = room.originalIndex;
                                const isLocked = lockingPuzzlesByRoomId.has(room.id);
                                const lockingPuzzleName = lockingPuzzlesByRoomId.get(room.id);
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => goToRoom(index)}
                                        disabled={isLocked}
                                        className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col items-start ${
                                            currentRoomIndex === index
                                                ? 'bg-brand-600 text-white font-bold shadow-lg'
                                                : isLocked
                                                ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                                                : 'bg-slate-700 hover:bg-slate-600'
                                        }`}
                                        title={isLocked ? `Locked by: ${lockingPuzzleName}` : ''}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm truncate">{room.name}</h3>
                                            {isLocked && <p className="text-red-500 text-xs truncate">Locked by: {lockingPuzzleName}</p>}
                                        </div>
                                        {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-300">Inventory</h3>
                             <div className="flex items-center gap-2">
                                <button
                                    onClick={handleToggleAllInventoryDescriptions}
                                    className="p-1.5 text-slate-400 hover:text-white"
                                    title={areAllDescriptionsVisible ? "Hide all descriptions" : "Show all descriptions"}
                                >
                                    <Icon as={areAllDescriptionsVisible ? "collapse" : "expand"} className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleAddCustomItem}
                                    className="p-1.5 text-slate-400 hover:text-white"
                                    title="Add custom temporary item"
                                >
                                    <Icon as="plus" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {combinedInventoryObjects.length > 0 ? (
                            combinedInventoryObjects.map(obj => (
                                <ObjectItem 
                                    key={obj.id} 
                                    obj={obj} 
                                    onToggle={obj.id.startsWith('custom-') ? handleToggleCustomItem : handleToggleObject}
                                    showVisibilityToggle={true}
                                    isDescriptionVisible={visibleDescriptionIds.has(obj.id)}
                                    onToggleDescription={handleToggleDescriptionVisibility}
                                    onToggleImage={handleToggleObjectImage}
                                />
                            ))
                        ) : (
                            <p className="text-slate-400 italic">Inventory is empty.</p>
                        )}
                    </div>
                )}
                {activeTab === 'discarded' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-300">Discarded Items</h3>
                        {combinedDiscardedObjects.length > 0 ? (
                             combinedDiscardedObjects.map(obj => (
                                <div key={obj.id} className="p-3 bg-slate-700/50 rounded-lg opacity-60">
                                    <h4 className="font-semibold text-slate-400 line-through">{obj.name}</h4>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic">No items have been discarded.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
        
        {/* Column 2: CURRENT ROOM STATE */}
        <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold truncate">{currentRoom.name}</h2>
                </div>
                {hasSolvedState && (
                    <label className={`flex items-center gap-2 text-sm ${roomSolveIsLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${currentRoom.isSolved ? 'text-green-300' : 'text-slate-400'}`}
                        title={roomSolveIsLocked ? `Locked by: ${roomSolveLockingPuzzleName}` : ''}
                    >
                        <span>Solved</span>
                        <input
                            type="checkbox"
                            checked={currentRoom.isSolved}
                            onChange={e => handleToggleRoomSolved(currentRoom.id, e.target.checked)}
                            className="sr-only peer"
                            disabled={roomSolveIsLocked}
                        />
                        <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                )}
            </div>
            
            <div className="flex-grow overflow-y-auto bg-slate-700/50 p-4 rounded-lg">
                <MarkdownRenderer content={currentRoom.isSolved ? currentRoom.solvedNotes : currentRoom.notes} />
            </div>
        </div>

        {/* Column 3: INTERACTIVE ELEMENTS */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
            {/* Available Objects */}
            {!game.hideAvailableObjects && availableObjects.length > 0 && (
                <div className="flex-shrink-0 bg-slate-700/50 p-3 rounded-lg">
                    <h3 className="text-md font-semibold text-slate-300 mb-2">Available to Pick Up</h3>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {availableObjects.map(obj => (
                            <ObjectItem 
                                key={obj.id}
                                obj={obj}
                                onToggle={handleToggleObject}
                                variant="mini"
                            />
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                {/* Actions */}
                <div className="flex-grow flex flex-col overflow-hidden bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex-shrink-0 flex items-center justify-between mb-2">
                        <h3 className="text-md font-semibold text-slate-300">Player Actions</h3>
                        <div className="flex items-center gap-1 text-sm bg-slate-800 p-1 rounded-md">
                            <button onClick={() => setActiveActionTab('open')} className={`px-2 py-0.5 rounded ${activeActionTab === 'open' ? 'bg-slate-600' : ''}`}>Open</button>
                            <button onClick={() => setActiveActionTab('complete')} className={`px-2 py-0.5 rounded ${activeActionTab === 'complete' ? 'bg-slate-600' : ''}`}>Complete</button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 -mr-3 space-y-4">
                        {activeActionTab === 'open' && (openActions.length > 0 ? openActions.map(action => (
                            <ActionItem 
                                key={action.id} 
                                action={action} 
                                onToggleImage={handleToggleActionImage}
                                onToggleComplete={handleToggleActionComplete}
                                isLocked={lockingPuzzlesByActionId.has(action.id)}
                                lockingPuzzleName={lockingPuzzlesByActionId.get(action.id)}
                            />
                        )) : <p className="text-sm text-slate-400 italic">No available actions in this room.</p>)}
                        
                        {activeActionTab === 'complete' && (completedActions.length > 0 ? completedActions.map(action => (
                            <ActionItem 
                                key={action.id} 
                                action={action} 
                                onToggleImage={() => {}}
                                onToggleComplete={() => {}}
                            />
                        )) : <p className="text-sm text-slate-400 italic">No completed actions in this room.</p>)}
                    </div>
                </div>

                {/* Puzzles */}
                <div className="flex-grow flex flex-col overflow-hidden bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex-shrink-0 flex items-center justify-between mb-2">
                        <h3 className="text-md font-semibold text-slate-300">Puzzles</h3>
                        <div className="flex items-center gap-1 text-sm bg-slate-800 p-1 rounded-md">
                            <button onClick={() => setActivePuzzleTab('open')} className={`px-2 py-0.5 rounded ${activePuzzleTab === 'open' ? 'bg-slate-600' : ''}`}>Open</button>
                            <button onClick={() => setActivePuzzleTab('complete')} className={`px-2 py-0.5 rounded ${activePuzzleTab === 'complete' ? 'bg-slate-600' : ''}`}>Complete</button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 -mr-3 space-y-4">
                        {activePuzzleTab === 'open' && (openPuzzles.length > 0 ? openPuzzles.map(puzzle => (
                            <PuzzleItem 
                                key={puzzle.id} 
                                puzzle={puzzle} 
                                onToggle={handleTogglePuzzle}
                                onToggleImage={handleTogglePuzzleImage}
                                onAttemptSolve={handleAttemptSolve}
                                isLocked={lockingPuzzlesByPuzzleId.has(puzzle.id)}
                                lockingPuzzleName={lockingPuzzlesByPuzzleId.get(puzzle.id)}
                            />
                        )) : <p className="text-sm text-slate-400 italic">No open puzzles in this room.</p>)}
                        
                        {activePuzzleTab === 'complete' && (completedPuzzles.length > 0 ? completedPuzzles.map(puzzle => (
                             <PuzzleItem 
                                key={puzzle.id} 
                                puzzle={puzzle} 
                                onToggle={() => {}}
                                onToggleImage={() => {}}
                                onAttemptSolve={() => {}}
                            />
                        )) : <p className="text-sm text-slate-400 italic">No completed puzzles in this room.</p>)}
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

// FIX: Added default export for the PresenterView component.
export default PresenterView;