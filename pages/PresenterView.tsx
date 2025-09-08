import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType, InventoryObject, Puzzle, Action, SoundboardClip } from '../types';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import { usePresenterState } from '../hooks/usePresenterState';
import { generateUUID } from '../utils/uuid';
import Icon from '../components/Icon';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ObjectItem from '../components/presenter/ObjectItem';
import PuzzleItem from '../components/presenter/PuzzleItem';
import ActionItem from '../components/presenter/ActionItem';
import { API_BASE_URL } from '../services/presentationService';

// Interfaces for component state
interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_SYNC';
  roomIndex?: number;
  game?: Game;
  customItems?: InventoryObject[];
}

type Status = 'loading' | 'success' | 'error';
type RightPanelTab = 'inventory' | 'soundboard';

const PresenterView: React.FC = () => {
  // HOOKS
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('inventory');
  const [solveModalPuzzle, setSolveModalPuzzle] = useState<Puzzle | null>(null);
  const [solveAttempt, setSolveAttempt] = useState('');
  const [solveError, setSolveError] = useState('');

  // Custom Inventory State
  const [customItems, setCustomItems] = useState<InventoryObject[]>([]);
  const [newCustomItemName, setNewCustomItemName] = useState('');
  
  // Soundtrack State
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isSoundtrackPlaying, setIsSoundtrackPlaying] = useState(false);
  const [soundtrackVolume, setSoundtrackVolume] = useState(0.5);

  // Broadcast Channel for syncing with presentation view
  const channelName = `game-${id}`;
  const postMessage = useBroadcastChannel<BroadcastMessage>(channelName, () => {});

  // Memoized presenter state (locking logic, etc.)
  const {
    lockingPuzzlesByObjectId,
    lockingPuzzlesByPuzzleId,
    lockingPuzzlesByActionId,
    lockingPuzzlesByRoomId,
    lockingPuzzlesByActNumber,
    inventoryObjects,
  } = usePresenterState(game);

  // DATA FETCHING & SYNCING
  useEffect(() => {
    if (id) {
      const fetchGame = async () => {
        setStatus('loading');
        const data = await gameService.getGame(id);
        if (data) {
          setGame(data);
          const initialRoomIndex = data.visitedRoomIds.length > 0
            ? data.rooms.findIndex(r => r.id === data.visitedRoomIds[data.visitedRoomIds.length - 1])
            : 0;
          setCurrentRoomIndex(Math.max(0, initialRoomIndex));
          setSoundtrackVolume(data.soundtrackVolume ?? 0.5);
          setStatus('success');
        } else {
          setStatus('error');
        }
      };
      fetchGame();
    }
  }, [id]);

  // Sync state with PresentationView whenever game state or current room changes
  useEffect(() => {
    if (game && status === 'success') {
      postMessage({ type: 'STATE_SYNC', game, customItems });
      postMessage({ type: 'GOTO_ROOM', roomIndex: currentRoomIndex, customItems });
    }
  }, [game, currentRoomIndex, customItems, postMessage, status]);
  
  const saveGame = useCallback((updatedGame: Game) => {
      gameService.saveGame(updatedGame).catch(err => {
          console.error("Failed to save game state:", err);
          alert("Error: Could not save game state to the server. Your changes might be lost.");
      });
  }, []);

  const updateGame = useCallback((updater: (prevGame: Game) => Game, skipSave = false) => {
      setGame(prevGame => {
          if (!prevGame) return null;
          const newGame = updater(prevGame);
          if (!skipSave) {
              saveGame(newGame);
          }
          return newGame;
      });
  }, [saveGame]);

  // HANDLERS
  const goToRoom = (index: number) => {
    if (!game || index < 0 || index >= game.rooms.length) return;

    const newRoomId = game.rooms[index].id;
    const isLocked = lockingPuzzlesByRoomId.has(newRoomId);

    if (isLocked) {
      alert(`This room is locked by: ${lockingPuzzlesByRoomId.get(newRoomId)}`);
      return;
    }

    setCurrentRoomIndex(index);

    updateGame(prevGame => {
        const visited = new Set(prevGame.visitedRoomIds);
        visited.add(newRoomId);
        
        const currentRoom = prevGame.rooms[index];
        if (!currentRoom.objectRemoveIds || currentRoom.objectRemoveIds.length === 0) {
          return { ...prevGame, visitedRoomIds: Array.from(visited) };
        }

        const newRooms = prevGame.rooms.map(room => ({
            ...room,
            objects: room.objects.map(obj => {
                if (currentRoom.objectRemoveIds.includes(obj.id)) {
                    return { ...obj, showInInventory: false };
                }
                return obj;
            })
        }));

        if (currentRoom.objectRemoveText) {
          alert(`As you enter ${currentRoom.name}:\n\n${currentRoom.objectRemoveText}`);
        }

        return { ...prevGame, rooms: newRooms, visitedRoomIds: Array.from(visited) };
    });
  };

  const handleToggleObject = (objectId: string, showInInventory: boolean) => {
    updateGame(prevGame => {
        const newRooms = prevGame.rooms.map(room => ({
            ...room,
            objects: room.objects.map(obj => {
                if (obj.id === objectId) {
                    return { 
                        ...obj, 
                        showInInventory,
                        wasEverInInventory: obj.wasEverInInventory || showInInventory,
                        addedToInventoryTimestamp: showInInventory ? Date.now() : obj.addedToInventoryTimestamp
                    };
                }
                return obj;
            })
        }));
        return { ...prevGame, rooms: newRooms };
    });
  };

  const handleToggleImageOverlay = (itemId: string, itemType: 'puzzle' | 'object' | 'action', state: boolean) => {
    updateGame(prevGame => {
        const newRooms = prevGame.rooms.map(room => {
          let objects = [...room.objects];
          let puzzles = [...room.puzzles];
          let actions = [...(room.actions || [])];

          if (state) { // if turning one on, turn all others off
              objects = objects.map(o => ({ ...o, showImageOverlay: o.id === itemId && itemType === 'object' ? state : false }));
              puzzles = puzzles.map(p => ({ ...p, showImageOverlay: p.id === itemId && itemType === 'puzzle' ? state : false }));
              actions = actions.map(a => ({ ...a, showImageOverlay: a.id === itemId && itemType === 'action' ? state : false }));
          } else { // if turning one off, just turn it off
              if (itemType === 'object') {
                  objects = objects.map(o => o.id === itemId ? { ...o, showImageOverlay: state } : o);
              } else if (itemType === 'puzzle') {
                  puzzles = puzzles.map(p => p.id === itemId ? { ...p, showImageOverlay: state } : p);
              } else if (itemType === 'action') {
                  actions = actions.map(a => a.id === itemId ? { ...a, showImageOverlay: state } : a);
              }
          }
          
          return { ...room, objects, puzzles, actions };
        });
        return { ...prevGame, rooms: newRooms };
    });
  };
  
  const handlePuzzleSolved = (puzzleId: string) => {
    updateGame(prevGame => {
        let solvedPuzzle: Puzzle | null = null;
        let newRooms = [...prevGame.rooms];

        newRooms = newRooms.map(room => ({
            ...room,
            puzzles: room.puzzles.map(p => {
                if (p.id === puzzleId) {
                    solvedPuzzle = { ...p, isSolved: true };
                    return solvedPuzzle;
                }
                return p;
            })
        }));

        if (!solvedPuzzle) return prevGame;

        const puzzle = solvedPuzzle;
        const now = Date.now();

        newRooms = newRooms.map(room => {
            let roomChanged = false;
            let newObjects = [...room.objects];
            let newActions = [...(room.actions || [])];
            let newIsSolved = room.isSolved;

            if (puzzle.discardObjectIds?.length) {
                newObjects = newObjects.map(obj => puzzle.discardObjectIds.includes(obj.id) ? { ...obj, showInInventory: false } : obj);
                roomChanged = true;
            }

            if (puzzle.autoAddLockedObjects && puzzle.lockedObjectIds?.length) {
                newObjects = newObjects.map(obj => puzzle.lockedObjectIds.includes(obj.id) 
                    ? { ...obj, showInInventory: true, wasEverInInventory: true, addedToInventoryTimestamp: now } 
                    : obj
                );
                roomChanged = true;
            }

            if (puzzle.completedActionIds?.length) {
                newActions = newActions.map(action => puzzle.completedActionIds.includes(action.id) ? { ...action, isComplete: true } : action);
                roomChanged = true;
            }

            if (puzzle.lockedRoomSolveIds?.includes(room.id)) {
                newIsSolved = true;
                roomChanged = true;
            }

            if (roomChanged) {
                return { ...room, objects: newObjects, actions: newActions, isSolved: newIsSolved };
            }
            return room;
        });
        
        return { ...prevGame, rooms: newRooms };
    });
  };

  const handleAttemptSolve = (puzzleId: string) => {
    const puzzle = game?.rooms.flatMap(r => r.puzzles).find(p => p.id === puzzleId);
    if (puzzle) {
        setSolveModalPuzzle(puzzle);
        setSolveAttempt('');
        setSolveError('');
    }
  };

  const submitSolveAttempt = () => {
    if (!solveModalPuzzle) return;
    const formattedAnswer = solveAttempt.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (formattedAnswer === solveModalPuzzle.answer) {
        handlePuzzleSolved(solveModalPuzzle.id);
        setSolveModalPuzzle(null);
    } else {
        setSolveError('Incorrect answer. Please try again.');
    }
  };

  const handleToggleActionComplete = (actionId: string, isComplete: boolean) => {
    updateGame(prevGame => ({
      ...prevGame,
      rooms: prevGame.rooms.map(room => ({
        ...room,
        actions: (room.actions || []).map(action => action.id === actionId ? { ...action, isComplete } : action)
      }))
    }));
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomItemName.trim()) return;
    const newItem: InventoryObject = {
        id: `custom-${generateUUID()}`,
        name: newCustomItemName.trim(),
        description: 'A custom item added by the presenter.',
        showInInventory: true,
        wasEverInInventory: true,
        image: null,
        inRoomImage: null,
        showImageOverlay: false,
        addedToInventoryTimestamp: Date.now(),
    };
    setCustomItems(prev => [newItem, ...prev]);
    setNewCustomItemName('');
  };

  const handleRemoveCustomItem = (itemId: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  const playNextTrack = useCallback(() => {
    if (!game?.soundtrack || game.soundtrack.length === 0) return;
    let nextIndex = (currentTrackIndex + 1) % game.soundtrack.length;
    if (game.soundtrackMode === 'shuffle') {
        nextIndex = Math.floor(Math.random() * game.soundtrack.length);
    }
    setCurrentTrackIndex(nextIndex);
  }, [game?.soundtrack, game?.soundtrackMode, currentTrackIndex]);

  useEffect(() => {
      if (currentTrackIndex === -1 || !game?.soundtrack || !game.soundtrack[currentTrackIndex]) return;

      const track = game.soundtrack[currentTrackIndex];
      const audio = new Audio(`${API_BASE_URL}/assets/${track.id}`);
      soundtrackAudioRef.current = audio;
      audio.volume = soundtrackVolume;
      if (isSoundtrackPlaying) {
          audio.play().catch(e => console.error("Soundtrack play error:", e));
      }
      audio.addEventListener('ended', playNextTrack);
      
      return () => {
          audio.pause();
          audio.removeEventListener('ended', playNextTrack);
          soundtrackAudioRef.current = null;
      }
  }, [currentTrackIndex, game?.soundtrack, playNextTrack, isSoundtrackPlaying, soundtrackVolume]);

  const handleToggleSoundtrack = () => {
      if (isSoundtrackPlaying) {
          if (soundtrackAudioRef.current) soundtrackAudioRef.current.pause();
          setIsSoundtrackPlaying(false);
      } else {
          setIsSoundtrackPlaying(true);
          if (soundtrackAudioRef.current) {
              soundtrackAudioRef.current.play().catch(e => console.error("Soundtrack play error:", e));
          } else if (currentTrackIndex === -1) {
              playNextTrack();
          }
      }
  };
  
  const handleSoundtrackVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setSoundtrackVolume(newVolume);
      if (soundtrackAudioRef.current) {
          soundtrackAudioRef.current.volume = newVolume;
      }
      if (game) {
        updateGame(g => ({ ...g, soundtrackVolume: newVolume }), true);
      }
  };

  const handleSaveVolume = () => {
    if (game) {
      updateGame(g => ({...g, soundtrackVolume}));
    }
  }

  if (status === 'loading') {
    return <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">Loading Presenter View...</div>;
  }

  if (status === 'error' || !game) {
    return <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">Error loading game.</div>;
  }
  
  const currentRoom = game.rooms[currentRoomIndex];
  
  const availableObjects = currentRoom.objects
    .filter(obj => !obj.showInInventory && !obj.wasEverInInventory)
    .sort((a,b) => (a.name > b.name) ? 1 : -1);
    
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-200 flex flex-col font-sans">
      {solveModalPuzzle && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700">
                  <h2 className="text-2xl font-bold mb-4 text-amber-400">{solveModalPuzzle.name}</h2>
                  {solveError && <p className="text-red-400 mb-4">{solveError}</p>}
                  <form onSubmit={(e) => { e.preventDefault(); submitSolveAttempt(); }}>
                      <input
                          type="text"
                          value={solveAttempt}
                          onChange={e => setSolveAttempt(e.target.value)}
                          placeholder="Enter answer..."
                          className="w-full font-mono text-lg px-4 py-2 border border-slate-600 rounded-lg bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          autoFocus
                      />
                      <div className="mt-6 flex justify-end gap-4">
                          <button type="button" onClick={() => setSolveModalPuzzle(null)} className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Submit</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <header className="flex-shrink-0 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-3 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-brand-400">Studio</Link>
          <div className="w-px h-6 bg-slate-700"></div>
          <h1 className="text-lg font-semibold">{game.title}</h1>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col">
          <h2 className="p-4 text-lg font-semibold border-b border-slate-700 flex-shrink-0">Rooms</h2>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {game.rooms.map((room, index) => {
                  const isLocked = lockingPuzzlesByRoomId.has(room.id);
                  const isActLocked = room.act ? lockingPuzzlesByActNumber.has(room.act) : false;
                  const isDisabled = isLocked || isActLocked;
                  let lockMessage = '';
                  if(isLocked) lockMessage += `Locked by: ${lockingPuzzlesByRoomId.get(room.id)}`;
                  if(isActLocked) lockMessage += (lockMessage ? '\n' : '') + `Act ${room.act} is locked by: ${lockingPuzzlesByActNumber.get(room.act!)}`;
                  
                  return (
                      <button 
                          key={room.id}
                          onClick={() => goToRoom(index)}
                          disabled={isDisabled}
                          title={lockMessage}
                          className={`w-full text-left p-3 rounded-md flex items-center gap-3 transition-colors ${
                              index === currentRoomIndex ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                         {(isLocked || isActLocked) && <Icon as="lock" className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                         <span className="truncate flex-grow">{room.name}</span>
                         {game.visitedRoomIds.includes(room.id) && <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" title="Visited"></div>}
                      </button>
                  );
              })}
          </div>
          {(game.soundtrack && game.soundtrack.length > 0) && (
              <div className="flex-shrink-0 p-4 border-t border-slate-700 space-y-3">
                  <h3 className="font-semibold text-sm">Soundtrack</h3>
                  <div className="flex items-center gap-3">
                      <button onClick={handleToggleSoundtrack} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
                          <Icon as={isSoundtrackPlaying ? 'stop' : 'play'} className="w-5 h-5" />
                      </button>
                      <button onClick={playNextTrack} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
                          <Icon as="next" className="w-5 h-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Now Playing:</p>
                          <p className="text-sm truncate">{currentTrackIndex > -1 ? game.soundtrack[currentTrackIndex].name : '...'}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <Icon as="audio" className="w-4 h-4 text-slate-500" />
                      <input
                          type="range" min="0" max="1" step="0.05"
                          value={soundtrackVolume}
                          onChange={handleSoundtrackVolumeChange}
                          onMouseUp={handleSaveVolume}
                          className="w-full"
                      />
                  </div>
              </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-bold">{currentRoom.name}</h2>
             <div className="flex gap-2">
              <button onClick={() => goToRoom(currentRoomIndex - 1)} disabled={currentRoomIndex === 0 || lockingPuzzlesByRoomId.has(game.rooms[currentRoomIndex-1]?.id)} className="p-2 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon as="prev" />
              </button>
              <button onClick={() => goToRoom(currentRoomIndex + 1)} disabled={currentRoomIndex === game.rooms.length - 1 || lockingPuzzlesByRoomId.has(game.rooms[currentRoomIndex+1]?.id)} className="p-2 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon as="next" />
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-brand-400">Host Notes</h3>
            <MarkdownRenderer content={currentRoom.isSolved && currentRoom.solvedNotes ? currentRoom.solvedNotes : currentRoom.notes} className="prose prose-invert max-w-none text-slate-300" />
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 text-brand-400">Puzzles</h3>
            <div className="space-y-4">
              {currentRoom.puzzles.length > 0 ? (
                currentRoom.puzzles.map(p => (
                  <PuzzleItem 
                    key={p.id} puzzle={p} 
                    onToggle={(id, state) => state && handlePuzzleSolved(id)}
                    onToggleImage={(id, state) => handleToggleImageOverlay(id, 'puzzle', state)}
                    onAttemptSolve={handleAttemptSolve}
                    isLocked={lockingPuzzlesByPuzzleId.has(p.id)}
                    lockingPuzzleName={lockingPuzzlesByPuzzleId.get(p.id)}
                  />
                ))
              ) : <p className="text-slate-500 italic">No puzzles in this room.</p>}
            </div>
          </div>

          {(currentRoom.actions && currentRoom.actions.length > 0) && (
            <div>
              <h3 className="font-semibold text-lg mb-2 text-brand-400">Player Actions / Host Responses</h3>
              <div className="space-y-4">
                {currentRoom.actions.map(a => (
                  <ActionItem
                    key={a.id} action={a}
                    onToggleComplete={handleToggleActionComplete}
                    onToggleImage={(id, state) => handleToggleImageOverlay(id, 'action', state)}
                    isLocked={lockingPuzzlesByActionId.has(a.id)}
                    lockingPuzzleName={lockingPuzzlesByActionId.get(a.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-96 bg-slate-800/50 border-l border-slate-700 flex flex-col">
          <div className="flex-shrink-0 border-b border-slate-700 flex">
              <button onClick={() => setRightPanelTab('inventory')} className={`flex-1 p-3 font-semibold text-sm ${rightPanelTab === 'inventory' ? 'bg-slate-700' : 'text-slate-400 hover:bg-slate-800'}`}>Inventory</button>
              {(game.soundboard && game.soundboard.length > 0) && (
                <button onClick={() => setRightPanelTab('soundboard')} className={`flex-1 p-3 font-semibold text-sm ${rightPanelTab === 'soundboard' ? 'bg-slate-700' : 'text-slate-400 hover:bg-slate-800'}`}>Sound Board</button>
              )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {rightPanelTab === 'inventory' && (
              <>
                {!(game.hideAvailableObjects) && (
                  <div>
                      <h3 className="font-semibold text-brand-400 mb-2">Available to Pick Up</h3>
                      <div className="space-y-2">
                        {availableObjects.length > 0 ? availableObjects.map(obj => (
                            <ObjectItem 
                              key={obj.id} obj={obj} onToggle={handleToggleObject}
                              onToggleImage={(id, state) => handleToggleImageOverlay(id, 'object', state)}
                              lockingPuzzleName={lockingPuzzlesByObjectId.get(obj.id)}
                              variant="mini"
                            />
                          ))
                          : <p className="text-slate-500 italic text-sm">None</p>
                        }
                      </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-brand-400 mb-2">Current Inventory</h3>
                  <div className="space-y-2">
                    {inventoryObjects.length > 0 || customItems.length > 0 ? (
                      <>
                        {customItems.map(item => (
                            <div key={item.id} className="flex flex-col gap-2 p-4 rounded-lg bg-purple-900/50">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold flex-grow text-purple-300">{item.name}</h3>
                                    <button onClick={() => handleRemoveCustomItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500" title="Remove Custom Item"><Icon as="trash" className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                        {inventoryObjects.map(obj => (
                            <ObjectItem
                              key={obj.id} obj={obj} onToggle={handleToggleObject}
                              onToggleImage={(id, state) => handleToggleImageOverlay(id, 'object', state)}
                            />
                        ))}
                      </>
                    ) : <p className="text-slate-500 italic text-sm">Inventory is empty.</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <h3 className="font-semibold text-brand-400 mb-2">Add Custom Item</h3>
                    <form onSubmit={handleAddCustomItem} className="flex gap-2">
                        <input
                          type="text" value={newCustomItemName} onChange={e => setNewCustomItemName(e.target.value)}
                          placeholder="Item name..."
                          className="flex-grow px-3 py-1.5 border border-slate-600 rounded-md bg-slate-900 text-sm"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700">+</button>
                    </form>
                </div>
              </>
            )}
            {rightPanelTab === 'soundboard' && (
              <div className="space-y-2">
                {(game.soundboard || []).map(clip => (
                  <SoundboardPlayer key={clip.id} clip={clip} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const SoundboardPlayer: React.FC<{ clip: SoundboardClip }> = ({ clip }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playSound = () => {
    if (!audioRef.current) audioRef.current = new Audio(`${API_BASE_URL}/assets/${clip.id}`);
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.error("Soundboard play error:", e));
  };
  return (
    <button onClick={playSound} className="w-full flex items-center gap-3 p-3 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors text-left">
      <Icon as="play" className="w-5 h-5 text-slate-400" />
      <span className="flex-1 truncate">{clip.name}</span>
    </button>
  );
};

export default PresenterView;
