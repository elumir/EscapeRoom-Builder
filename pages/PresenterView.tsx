import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import { API_BASE_URL } from '../services/presentationService';
import type { Game, Puzzle, InventoryObject, Room as RoomType } from '../types';
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

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
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
    mode: 'sequential' | 'shuffle' | 'loop';
  } | null>(null);
  const soundtrackRef = useRef(soundtrack);
  useEffect(() => { soundtrackRef.current = soundtrack; }, [soundtrack]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Soundboard State
  const [soundboardClips, setSoundboardClips] = useState<Map<string, {audio: HTMLAudioElement, isPlaying: boolean}>>(new Map());

  const soundtrackConfigKey = useMemo(() => {
    if (!game?.soundtrack) return null;
    const trackIds = game.soundtrack.map(t => t.id).join(',');
    return `${trackIds}|${game.soundtrackMode ?? 'sequential'}|${game.soundtrackVolume ?? 0.5}`;
  }, [game?.soundtrack, game?.soundtrackMode, game?.soundtrackVolume]);

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
    const wasPlaying = soundtrackRef.current?.isPlaying || false;

    // Initialize new soundtrack
    if (game?.soundtrack && game.soundtrack.length > 0) {
      const mode = game.soundtrackMode ?? 'sequential';
      const volume = game.soundtrackVolume ?? 0.5;
      
      const elements = game.soundtrack.map(track => {
        const audio = new Audio(`${API_BASE_URL}/assets/${track.id}`);
        audio.volume = volume;
        if (mode === 'loop') {
          audio.loop = true;
        }
        return audio;
      });
      
      // Only auto-play the next track for sequential/shuffle modes.
      if (mode !== 'loop') {
        elements.forEach(el => { el.onended = playNextTrack; });
      }
      
      const indices = Array.from(Array(elements.length).keys());
      const trackOrder = mode === 'shuffle' ? shuffleArray(indices) : indices;

      setSoundtrack({
        elements,
        trackOrder,
        currentTrackIndex: trackOrder.length > 0 ? trackOrder[0] : 0,
        isPlaying: wasPlaying,
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
        el.loop = false; // Reset loop property
      });
    };
  }, [soundtrackConfigKey, playNextTrack]);

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

  // Effect to manage UI updates for progress and duration of the current track
  useEffect(() => {
    if (!soundtrack) return;
    const currentAudio = soundtrack.elements[soundtrack.currentTrackIndex];
    if (!currentAudio) return;

    const handleMetadata = () => setDuration(currentAudio.duration);
    const handleTimeUpdate = () => setProgress(currentAudio.currentTime);
    
    currentAudio.addEventListener('loadedmetadata', handleMetadata);
    currentAudio.addEventListener('timeupdate', handleTimeUpdate);

    // Set initial values in case metadata is already loaded
    if (currentAudio.duration) {
        setDuration(currentAudio.duration);
    }
    setProgress(currentAudio.currentTime);

    return () => {
        currentAudio.removeEventListener('loadedmetadata', handleMetadata);
        currentAudio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [soundtrack, soundtrack?.currentTrackIndex]);

  // Effect for soundboard clips
  useEffect(() => {
    const newClipsMap = new Map<string, { audio: HTMLAudioElement; isPlaying: boolean }>();
    const soundboardData = game?.soundboard || [];

    soundboardData.forEach(clip => {
        const audio = new Audio(`${API_BASE_URL}/assets/${clip.id}`);
        audio.preload = 'auto';

        const handleEnded = () => {
            setSoundboardClips(prevClips => {
                const newMap = new Map(prevClips);
                const currentClip = newMap.get(clip.id);
                if (currentClip) {
                    newMap.set(clip.id, { ...currentClip, isPlaying: false });
                }
                return newMap;
            });
        };

        audio.addEventListener('ended', handleEnded);
        // Store the listener with the audio element to remove it in cleanup
        (audio as any)._handleEnded = handleEnded; 
        
        newClipsMap.set(clip.id, { audio, isPlaying: false });
    });

    setSoundboardClips(newClipsMap);

    return () => {
        soundboardClips.forEach(({ audio }) => {
            audio.pause();
            const handleEnded = (audio as any)._handleEnded;
            if (handleEnded) {
                audio.removeEventListener('ended', handleEnded);
            }
            audio.src = ''; // Release resource
        });
    };
  }, [game?.soundboard]);


  const handleAddCustomItem = (inventorySlot: 1 | 2) => {
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
        inRoomImage: null,
        showImageOverlay: false,
        inventorySlot,
        isPickupable: true
      };
      setCustomItems(prev => [newItem, ...prev]);
    }
  };

  const handleToggleCustomItem = (itemId: string, newState: boolean) => {
    setCustomItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, showInInventory: newState, addedToInventoryTimestamp: newState ? Date.now() : item.addedToInventoryTimestamp } 
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
    const handleBeforeUnload = () => {
      if (presentationWindow && !presentationWindow.closed) {
        presentationWindow.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
                    const newObj: InventoryObject = { ...obj, showInInventory: newState };
                    if (newState) { // Item is being added to inventory
                        newObj.wasEverInInventory = true;
                        newObj.addedToInventoryTimestamp = Date.now();
                        newObj.showInRoomImage = false; // Hide in-room image when picked up
                    } else { // Item is being removed from inventory (discarded)
                        if (game.discardMode === 'return_to_room') {
                            // By setting this to false, it will reappear in its original room
                            newObj.wasEverInInventory = false;
                        }
                        // If mode is 'discard_pile' or undefined, wasEverInInventory remains true,
                        // so it will appear in the discard pile.
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
                      showInRoomImage: false, // Hide in-room image when picked up by puzzle
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
                // The overlay is now hidden when the success modal is dismissed.
                return { ...p, isSolved: newState };
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

  const handleCloseSolvedModal = () => {
    if (!game || !solvedPuzzleInfo) return;

    // Create a new game state with the puzzle image overlay turned off.
    const updatedGame = {
        ...game,
        rooms: game.rooms.map(room => {
            // Find the room containing the puzzle
            const puzzleIndex = room.puzzles.findIndex(p => p.id === solvedPuzzleInfo.id);
            if (puzzleIndex === -1) {
                return room; // Not in this room
            }

            // Create a new puzzles array with the updated puzzle
            const newPuzzles = [...room.puzzles];
            newPuzzles[puzzleIndex] = { ...newPuzzles[puzzleIndex], showImageOverlay: false };

            return { ...room, puzzles: newPuzzles };
        })
    };

    // Update state and broadcast to the presentation view
    updateAndBroadcast(updatedGame);

    // Close the modal
    setSolvedPuzzleInfo(null);
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

  const handleToggleInRoomImage = (objectId: string, newState: boolean) => {
      if (!game) return;

      const updatedGame = {
          ...game,
          rooms: game.rooms.map(room => ({
              ...room,
              objects: room.objects.map(obj => {
                  if (obj.id === objectId) {
                      return { ...obj, showInRoomImage: newState };
                  }
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
            actions: (room.actions || []).map(action => {
                if (action.id === actionId) {
                    const updatedAction = { ...action, isComplete: newState };
                    // If the action is being marked as complete (hidden), also hide its image overlay.
                    if (newState) {
                        updatedAction.showImageOverlay = false;
                    }
                    return updatedAction;
                }
                return action;
            })
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

    width = screenWidth / 2;
    height = width / aspectRatio;

    if (height > screenHeight / 2) {
        height = screenHeight / 2;
        width = height * aspectRatio;
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

  const handleCloseGameWindow = () => {
    if (presentationWindow) {
        presentationWindow.close();
    }
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
    }, {} as Record<number, (RoomType & { originalIndex: number })[]>);
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

  const handleSoundtrackRewind = () => {
    if (!soundtrack) return;
    const currentAudio = soundtrack.elements[soundtrack.currentTrackIndex];
    if (currentAudio) {
        currentAudio.currentTime = 0;
    }
  };

  const handleSoundtrackSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!soundtrack) return;
    const newTime = Number(e.target.value);
    const currentAudio = soundtrack.elements[soundtrack.currentTrackIndex];
    if (currentAudio) {
        currentAudio.currentTime = newTime;
        setProgress(newTime);
    }
  };
  
  const handleSoundtrackVolumeChange = (newVolume: number) => {
    if (!soundtrack) return;
    soundtrack.elements.forEach(el => el.volume = newVolume);
    setSoundtrack({ ...soundtrack, volume: newVolume });
  };

  const handleSoundtrackFadeOut = () => {
    if (!soundtrack || isFadingOut || !soundtrack.isPlaying) return;

    if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
    }

    setIsFadingOut(true);
    const currentAudio = soundtrack.elements[soundtrack.currentTrackIndex];
    const fadeDuration = 1500; // 1.5 seconds
    const steps = 30;
    const interval = fadeDuration / steps;
    const initialVolume = currentAudio.volume;
    const volumeStep = initialVolume / steps;

    fadeIntervalRef.current = setInterval(() => {
        if (currentAudio.volume > volumeStep) {
            currentAudio.volume -= volumeStep;
        } else {
            currentAudio.volume = 0;
            currentAudio.pause();
            setSoundtrack(prev => (prev ? { ...prev, isPlaying: false } : null));

            currentAudio.volume = soundtrack.volume; // Reset volume for next playback

            clearInterval(fadeIntervalRef.current!);
            fadeIntervalRef.current = null;
            setIsFadingOut(false);
        }
    }, interval);
  };

  const handlePlaySoundboardClip = (clipId: string) => {
    setSoundboardClips(prevClips => {
        const newMap = new Map(prevClips);
        const clip = newMap.get(clipId);
        
        if (!clip) return prevClips;

        if (clip.isPlaying) {
            clip.audio.pause();
            clip.audio.currentTime = 0;
            newMap.set(clipId, { ...clip, isPlaying: false });
        } else {
            clip.audio.currentTime = 0;
            clip.audio.play().catch(e => console.error("Soundboard clip play failed:", e));
            newMap.set(clipId, { ...clip, isPlaying: true });
        }

        return newMap;
    });
  };

// FIX: Added missing return statement with JSX to render the component UI.
  if (status === 'loading') {
    return <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white">Loading Game...</div>;
  }

  if (status === 'error' || !game) {
     return <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white">Could not load game. It may be private or does not exist.</div>;
  }
  
  const currentRoom = game.rooms[currentRoomIndex];
  const openActions = (currentRoom.actions || []).filter(a => !a.isComplete);
  const completedActions = (currentRoom.actions || []).filter(a => a.isComplete);
  const openPuzzles = currentRoom.puzzles.filter(p => !p.isSolved);
  const completedPuzzles = currentRoom.puzzles.filter(p => p.isSolved);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans">
      {/* MODALS */}
      {puzzleToSolve && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-amber-400">Solve: {puzzleToSolve.name}</h2>
            <form onSubmit={handleSubmitAnswer}>
              <input
                type="text"
                value={submittedAnswer}
                onChange={e => setSubmittedAnswer(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-lg"
                autoFocus
              />
              {solveError && <p className="text-red-400 mt-2">{solveError}</p>}
              <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setPuzzleToSolve(null)} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {solvedPuzzleInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg text-center border border-green-500/50">
            <h2 className="text-3xl font-bold mb-4 text-green-400">Puzzle Solved!</h2>
            <p className="text-lg font-semibold mb-6">{solvedPuzzleInfo.name}</p>
            <button onClick={handleCloseSolvedModal} className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Continue</button>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Restart Game?</h2>
            <p className="text-slate-400 mb-6">This will reset all puzzles, inventory, and room states to their initial values for all viewers.</p>
            <div className="mt-6 flex justify-end gap-4">
              <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button type="button" onClick={handleRestartGame} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Yes, Restart</button>
            </div>
          </div>
        </div>
      )}
      
       {objectRemoveModalText && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Objects Removed</h2>
            <div className="text-slate-300 mb-6 whitespace-pre-wrap">{objectRemoveModalText}</div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setObjectRemoveModalText(null)} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex-shrink-0 bg-slate-800 p-2 flex justify-between items-center border-b border-slate-700">
        <h1 className="text-xl font-bold text-brand-400 px-2">{game.title}</h1>
        <div className="flex items-center gap-2">
            {isPresentationWindowOpen ? (
                <button onClick={handleCloseGameWindow} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm">
                    <Icon as="stop" className="w-4 h-4" />
                    Close Window
                </button>
            ) : (
                <button onClick={handleOpenGameWindow} className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors text-sm">
                    <Icon as="present" className="w-4 h-4" />
                    Open Player Window
                </button>
            )}

          <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors text-sm">
            <Icon as="restart" className="w-4 h-4" />
            Restart Game
          </button>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <aside className="w-80 bg-slate-800 p-4 flex flex-col border-r border-slate-700">
          <div className="flex border-b border-slate-600 mb-4 flex-shrink-0">
            {['rooms', 'inventory', 'discarded'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab as any); if (tab === 'inventory') setShowInventoryNotification(false); }} className={`flex-1 capitalize text-center py-2 text-sm font-semibold relative ${activeTab === tab ? 'text-brand-400 border-b-2 border-brand-400' : 'text-slate-400 hover:text-white'}`}>
                {tab}
                {tab === 'inventory' && showInventoryNotification && (
                  <span className="absolute top-1 right-2 w-2 h-2 bg-sky-400 rounded-full"></span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 -mr-4">
            {activeTab === 'rooms' && (
              <div className="space-y-1">
                {Object.entries(roomsByAct).map(([act, rooms]) => {
                  const isActLocked = lockingPuzzlesByActNumber.has(Number(act));
                  const lockingPuzzleName = lockingPuzzlesByActNumber.get(Number(act));
                  return (
                    <div key={act}>
                      <h3 className={`text-sm font-bold text-slate-400 uppercase tracking-wider p-2 flex items-center gap-2 ${isActLocked ? 'opacity-50' : ''}`} title={isActLocked ? `Locked by: ${lockingPuzzleName}` : undefined}>
                        {isActLocked && <Icon as="lock" className="w-3 h-3" />}
                        Act {act}
                      </h3>
                      <div className="space-y-1">
                        {rooms.map(room => {
                          const isLocked = lockingPuzzlesByRoomId.has(room.id);
                          return (
                            <button
                              key={room.id}
                              onClick={() => goToRoom(room.originalIndex)}
                              disabled={isLocked}
                              className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                                currentRoomIndex === room.originalIndex
                                  ? 'bg-brand-500/30 text-brand-300'
                                  : 'hover:bg-slate-700'
                              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                               title={isLocked ? `Locked by: ${lockingPuzzlesByRoomId.get(room.id)}` : ''}
                            >
                              {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                              <span className="truncate">{room.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'inventory' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Inventory</h3>
                   <button onClick={handleToggleAllInventoryDescriptions} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                      <Icon as={areAllDescriptionsVisible ? 'collapse' : 'expand'} className="w-3 h-3" />
                      {areAllDescriptionsVisible ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>
                 {game.inventoryLayout === 'dual' ? (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-slate-400">{game.inventory1Title || 'Inventory 1'}</h4>
                        <button onClick={() => handleAddCustomItem(1)} className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700"><Icon as="plus" className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2">
                        {combinedInventoryObjects.filter(obj => (obj.inventorySlot || 1) === 1).map(obj => (
                            <ObjectItem key={obj.id} obj={obj} onToggle={obj.id.startsWith('custom-') ? handleToggleCustomItem : handleToggleObject} showVisibilityToggle onToggleDescription={handleToggleDescriptionVisibility} isDescriptionVisible={visibleDescriptionIds.has(obj.id)} onToggleImage={handleToggleObjectImage} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-slate-400">{game.inventory2Title || 'Inventory 2'}</h4>
                        <button onClick={() => handleAddCustomItem(2)} className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700"><Icon as="plus" className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2">
                        {combinedInventoryObjects.filter(obj => obj.inventorySlot === 2).map(obj => (
                           <ObjectItem key={obj.id} obj={obj} onToggle={obj.id.startsWith('custom-') ? handleToggleCustomItem : handleToggleObject} showVisibilityToggle onToggleDescription={handleToggleDescriptionVisibility} isDescriptionVisible={visibleDescriptionIds.has(obj.id)} onToggleImage={handleToggleObjectImage} />
                        ))}
                      </div>
                    </div>
                  </>
                 ) : (
                  combinedInventoryObjects.map(obj => (
                      <ObjectItem key={obj.id} obj={obj} onToggle={obj.id.startsWith('custom-') ? handleToggleCustomItem : handleToggleObject} showVisibilityToggle onToggleDescription={handleToggleDescriptionVisibility} isDescriptionVisible={visibleDescriptionIds.has(obj.id)} onToggleImage={handleToggleObjectImage} />
                  ))
                 )}
              </div>
            )}
            {activeTab === 'discarded' && (
              <div className="space-y-2">
                <h3 className="font-bold mb-2">Discarded Items</h3>
                {combinedDiscardedObjects.map(obj => (
                  <div key={obj.id} className="p-2 bg-slate-700/50 rounded-md flex items-center justify-between gap-2 opacity-60">
                    <span className="text-sm line-through truncate">{obj.name}</span>
                    <button onClick={() => (obj.id.startsWith('custom-') ? handleToggleCustomItem : handleToggleObject)(obj.id, true)} className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-600">
                      <Icon as="rewind" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER PANEL */}
        <section className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex-shrink-0 flex justify-between items-center">
                <h2 className="text-2xl font-bold truncate pr-4">{currentRoom.name}</h2>
                <div className="flex items-center gap-2">
                     <button onClick={handlePrevAct} disabled={!canGoToPrevAct} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" title={isPrevActLocked ? `Locked by: ${prevActLockingPuzzleName}` : `Go to previous act`}>
                        <Icon as="prev" className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-slate-400">Act {selectedAct}</span>
                    <button onClick={handleNextAct} disabled={!canGoToNextAct} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" title={isNextActLocked ? `Locked by: ${nextActLockingPuzzleName}` : `Go to next act`}>
                        <Icon as="next" className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">Room Description</h3>
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                      <MarkdownRenderer content={currentRoom.isSolved ? currentRoom.solvedNotes : currentRoom.notes} />
                  </div>
                </div>
                {game.hideAvailableObjects !== true && (
                  <div>
                      <h3 className="font-bold text-lg mb-2">Available to Pick Up</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {currentRoom.objects.filter(obj => !obj.showInInventory).map(obj => (
                              <ObjectItem key={obj.id} obj={obj} onToggle={handleToggleObject} lockingPuzzleName={lockingPuzzlesByObjectId.get(obj.id)} onToggleInRoomImage={handleToggleInRoomImage} variant="mini"/>
                          ))}
                      </div>
                  </div>
                )}
                 <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-bold text-lg">Player Actions</h3>
                        <div className="flex rounded-md bg-slate-800 p-0.5 text-xs">
                           <button onClick={() => setActiveActionTab('open')} className={`px-2 py-0.5 rounded ${activeActionTab === 'open' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Open ({openActions.length})</button>
                           <button onClick={() => setActiveActionTab('complete')} className={`px-2 py-0.5 rounded ${activeActionTab === 'complete' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Complete ({completedActions.length})</button>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        {(activeActionTab === 'open' ? openActions : completedActions).map(action => (
                           <ActionItem key={action.id} action={action} onToggleImage={handleToggleActionImage} onToggleComplete={handleToggleActionComplete} isLocked={lockingPuzzlesByActionId.has(action.id)} lockingPuzzleName={lockingPuzzlesByActionId.get(action.id)} variant="mini"/>
                        ))}
                    </div>
                 </div>
                 <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-bold text-lg">Puzzles</h3>
                       <div className="flex rounded-md bg-slate-800 p-0.5 text-xs">
                           <button onClick={() => setActivePuzzleTab('open')} className={`px-2 py-0.5 rounded ${activePuzzleTab === 'open' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Open ({openPuzzles.length})</button>
                           <button onClick={() => setActivePuzzleTab('complete')} className={`px-2 py-0.5 rounded ${activePuzzleTab === 'complete' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Complete ({completedPuzzles.length})</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         {(activePuzzleTab === 'open' ? openPuzzles : completedPuzzles).map(puzzle => (
                           <PuzzleItem key={puzzle.id} puzzle={puzzle} onToggle={handleTogglePuzzle} onToggleImage={handleTogglePuzzleImage} onAttemptSolve={handleAttemptSolve} isLocked={lockingPuzzlesByPuzzleId.has(puzzle.id)} lockingPuzzleName={lockingPuzzlesByPuzzleId.get(puzzle.id)} variant="mini" />
                         ))}
                     </div>
                 </div>
            </div>
             <div className="p-4 border-t border-slate-700 flex-shrink-0">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={currentRoom.isSolved} onChange={e => handleToggleRoomSolved(currentRoom.id, e.target.checked)} className="sr-only peer" disabled={lockingPuzzlesByRoomSolveId.has(currentRoom.id)}/>
                    <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
                    <span className="font-semibold">Room is Solved</span>
                  </label>
                  {lockingPuzzlesByRoomSolveId.has(currentRoom.id) && (
                    <p className="text-xs text-red-500 mt-1 pl-14">Locked by: {lockingPuzzlesByRoomSolveId.get(currentRoom.id)}</p>
                  )}
            </div>
        </section>

        {/* RIGHT PANEL */}
        <aside className="w-80 bg-slate-800 p-4 flex flex-col border-l border-slate-700">
            {soundtrack && (
              <div className="mb-6 flex-shrink-0">
                  <h3 className="font-bold mb-2">Soundtrack</h3>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                      <p className="font-semibold text-sm truncate" title={game.soundtrack?.[soundtrack.currentTrackIndex]?.name}>{game.soundtrack?.[soundtrack.currentTrackIndex]?.name || 'No Track'}</p>
                      <div className="flex items-center gap-2 mt-3">
                          <button onClick={handleSoundtrackPrev} className="p-2 hover:bg-slate-600 rounded-full"><Icon as="prev" className="w-4 h-4" /></button>
                          <button onClick={handleSoundtrackRewind} className="p-2 hover:bg-slate-600 rounded-full"><Icon as="rewind" className="w-4 h-4" /></button>
                          <button onClick={handleSoundtrackPlayPause} className="p-3 bg-brand-600 rounded-full hover:bg-brand-500"><Icon as={soundtrack.isPlaying ? 'stop' : 'play'} className="w-5 h-5" /></button>
                          <button onClick={handleSoundtrackNext} className="p-2 hover:bg-slate-600 rounded-full"><Icon as="next" className="w-4 h-4" /></button>
                          <button onClick={handleSoundtrackFadeOut} disabled={isFadingOut} className="p-2 hover:bg-slate-600 rounded-full text-xs font-bold disabled:opacity-50">FADE</button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400 font-mono">{formatTime(progress)}</span>
                          <input type="range" min="0" max={duration || 0} value={progress} onChange={handleSoundtrackSeek} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full" />
                          <span className="text-xs text-slate-400 font-mono">{formatTime(duration)}</span>
                      </div>
                       <input type="range" min="0" max="1" step="0.05" value={soundtrack.volume} onChange={e => handleSoundtrackVolumeChange(parseFloat(e.target.value))} className="w-full mt-2 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-slate-400 [&::-webkit-slider-thumb]:rounded-full" />
                  </div>
              </div>
            )}
            <h3 className="font-bold mb-2 flex-shrink-0">Sound Board</h3>
            <div className="flex-1 overflow-y-auto pr-2 -mr-4 grid grid-cols-2 gap-2 content-start">
              {Array.from(soundboardClips.entries()).map(([id, { isPlaying }]) => {
                const clipInfo = game.soundboard?.find(c => c.id === id);
                return (
                  <button key={id} onClick={() => handlePlaySoundboardClip(id)} className={`p-2 rounded-md text-left text-sm font-semibold truncate transition-colors ${isPlaying ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    {clipInfo?.name || 'Sound Clip'}
                  </button>
                )
              })}
            </div>
        </aside>
      </main>
    </div>
  );
};

export default PresenterView;
