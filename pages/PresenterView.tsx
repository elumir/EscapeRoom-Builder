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
        
        return { ...room, objects: newObjects, puzzles: newPuzzles, isSolved: newIsSolvedState, actions: newActions };
    });

    updateAndBroadcast({ ...game, rooms: updatedRooms });
  };
  
  // FIX: This file was truncated and malformed. The component function was not closed and did not return a value.
  // I have added the necessary closing braces, a default export, and standard loading/error states.
  // The main UI for the presenter view is missing from the file, so this component currently returns null in its success state.
  const currentRoom = game?.rooms[currentRoomIndex];

  if (status === 'loading') {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        Loading Presentation...
      </div>
    );
  }

  if (status === 'error' || !game || !currentRoom) {
     return (
       <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
         Could not load presentation. It may be private or does not exist.
       </div>
     );
  }

  // The main UI for this component is missing from the provided file content.
  // Returning null to satisfy the component's type contract and fix the compilation error.
  return null;
};

export default PresenterView;
