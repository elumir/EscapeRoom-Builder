
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType, InventoryObject, Puzzle, Action } from '../types';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import { usePresenterState } from '../hooks/usePresenterState';
import Icon from '../components/Icon';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ObjectItem from '../components/presenter/ObjectItem';
import PuzzleItem from '../components/presenter/PuzzleItem';
import ActionItem from '../components/presenter/ActionItem';
import FontLoader from '../components/FontLoader';

// Types
type Status = 'loading' | 'success' | 'error';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_SYNC';
  roomIndex?: number;
  game?: Game;
  customItems?: InventoryObject[];
}

const PresenterView: React.FC = () => {
    // Hooks
    const { id } = useParams<{ id: string }>();
    const postMessage = useBroadcastChannel<BroadcastMessage>(`game-${id}`, () => {});
    
    // State
    const [game, setGame] = useState<Game | null>(null);
    const [status, setStatus] = useState<Status>('loading');
    const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
    const [solvePuzzleModalId, setSolvePuzzleModalId] = useState<string | null>(null);
    const [puzzleAttempt, setPuzzleAttempt] = useState('');
    const [solveError, setSolveError] = useState<string | null>(null);
    const [visibleObjectDescriptions, setVisibleObjectDescriptions] = useState<Set<string>>(new Set());
    const [collapsedActs, setCollapsedActs] = useState<Record<number, boolean>>({});

    // Derived State
    const {
        lockingPuzzlesByRoomId,
        lockingPuzzlesByPuzzleId,
        lockingPuzzlesByRoomSolveId,
        lockingPuzzlesByActionId,
        lockingPuzzlesByObjectId,
        lockingPuzzlesByActNumber,
        inventoryObjects,
    } = usePresenterState(game);

    const currentRoom = useMemo(() => game?.rooms[currentRoomIndex], [game, currentRoomIndex]);

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

    // Callbacks and Effects
    const syncState = useCallback((updatedGame: Game, newRoomIndex?: number) => {
        setGame(updatedGame);
        postMessage({
            type: 'STATE_SYNC',
            game: updatedGame,
            customItems: [],
        });
        if (newRoomIndex !== undefined) {
             postMessage({ type: 'GOTO_ROOM', roomIndex: newRoomIndex });
        }
        gameService.saveGame(updatedGame);
    }, [postMessage]);

    const updateGameState = useCallback((updater: (draft: Game) => void) => {
        if (!game) return;
        const newGame = structuredClone(game);
        updater(newGame);
        syncState(newGame);
    }, [game, syncState]);

    useEffect(() => {
        if (id) {
            const fetchInitialState = async () => {
                const data = await gameService.getGame(id);
                if (data) {
                    setGame(data);
                    const initialIndex = data.visitedRoomIds.length > 0
                        ? data.rooms.findIndex(r => r.id === data.visitedRoomIds[data.visitedRoomIds.length - 1])
                        : 0;
                    const validIndex = Math.max(0, initialIndex);
                    setCurrentRoomIndex(validIndex);
                    postMessage({ type: 'GOTO_ROOM', roomIndex: validIndex });
                    postMessage({ type: 'STATE_SYNC', game: data, customItems: [] });
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            };
            fetchInitialState();
        }
    }, [id, postMessage]);

    const handleGoToRoom = useCallback((index: number) => {
        if (!game || index === currentRoomIndex) return;
        
        setCurrentRoomIndex(index);
        postMessage({ type: 'GOTO_ROOM', roomIndex: index });
        
        updateGameState(draft => {
            const newRoomId = draft.rooms[index].id;
            if (!draft.visitedRoomIds.includes(newRoomId)) {
                draft.visitedRoomIds.push(newRoomId);
            }
            const room = draft.rooms[index];
            const objectsToRemove = room.objectRemoveIds || [];
            if (objectsToRemove.length > 0) {
                 for (const r of draft.rooms) {
                    for (const obj of r.objects) {
                        if (objectsToRemove.includes(obj.id)) {
                            obj.showInInventory = false;
                        }
                    }
                }
            }
        });
    }, [game, currentRoomIndex, postMessage, updateGameState]);
    
    const handleObjectToggle = useCallback((objectId: string, showInInventory: boolean) => {
        updateGameState(draft => {
            for (const room of draft.rooms) {
                const obj = room.objects.find(o => o.id === objectId);
                if (obj) {
                    obj.showInInventory = showInInventory;
                    if (showInInventory) {
                        obj.wasEverInInventory = true;
                        obj.addedToInventoryTimestamp = Date.now();
                    } else if (draft.discardMode === 'return_to_room') {
                        obj.showInRoomImage = true;
                    }
                    return;
                }
            }
        });
    }, [updateGameState]);

    const handleObjectImageToggle = useCallback((objectId: string, show: boolean) => {
        updateGameState(draft => {
            draft.rooms.forEach(r => {
                r.objects.forEach(o => { if (o.id !== objectId) o.showImageOverlay = false; });
                r.puzzles.forEach(p => p.showImageOverlay = false);
                (r.actions || []).forEach(a => a.showImageOverlay = false);
            });
            for (const room of draft.rooms) {
                const obj = room.objects.find(o => o.id === objectId);
                if (obj) {
                    obj.showImageOverlay = show;
                    return;
                }
            }
        });
    }, [updateGameState]);

    const handleObjectInRoomImageToggle = useCallback((objectId: string, show: boolean) => {
        updateGameState(draft => {
            for (const room of draft.rooms) {
                const obj = room.objects.find(o => o.id === objectId);
                if (obj) {
                    obj.showInRoomImage = show;
                    return;
                }
            }
        });
    }, [updateGameState]);

    const handlePuzzleToggle = useCallback((puzzleId: string, isSolved: boolean) => {
        if (!isSolved) return;
        updateGameState(draft => {
            let solvedPuzzle: Puzzle | undefined;
            for (const room of draft.rooms) {
                const p = room.puzzles.find(p => p.id === puzzleId);
                if (p) {
                    p.isSolved = isSolved;
                    solvedPuzzle = p;
                    break;
                }
            }
            if (solvedPuzzle) {
                if (solvedPuzzle.autoAddLockedObjects && solvedPuzzle.lockedObjectIds) {
                    for (const r of draft.rooms) {
                        r.objects.forEach(o => {
                            if (solvedPuzzle?.lockedObjectIds.includes(o.id)) {
                                o.showInInventory = true;
                                o.wasEverInInventory = true;
                                o.addedToInventoryTimestamp = Date.now();
                            }
                        });
                    }
                }
                if (solvedPuzzle.discardObjectIds) {
                     for (const r of draft.rooms) {
                        r.objects.forEach(o => {
                            if (solvedPuzzle?.discardObjectIds.includes(o.id)) {
                                o.showInInventory = false;
                            }
                        });
                    }
                }
                if (solvedPuzzle.completedActionIds) {
                    for (const r of draft.rooms) {
                        (r.actions || []).forEach(a => {
                            if (solvedPuzzle?.completedActionIds.includes(a.id)) {
                                a.isComplete = true;
                            }
                        });
                    }
                }
            }
        });
    }, [updateGameState]);

    const handlePuzzleImageToggle = useCallback((puzzleId: string, show: boolean) => {
        updateGameState(draft => {
            draft.rooms.forEach(r => {
                r.objects.forEach(o => o.showImageOverlay = false);
                (r.actions || []).forEach(a => a.showImageOverlay = false);
                r.puzzles.forEach(p => {
                    if (p.id !== puzzleId) p.showImageOverlay = false;
                });
            });
            for (const room of draft.rooms) {
                const p = room.puzzles.find(p => p.id === puzzleId);
                if (p) {
                    p.showImageOverlay = show;
                    return;
                }
            }
        });
    }, [updateGameState]);

    const handleAttemptSolvePuzzle = useCallback((puzzleId: string) => {
        setSolveError(null);
        setPuzzleAttempt('');
        setSolvePuzzleModalId(puzzleId);
    }, []);

    const handleSolveModalSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!game || !solvePuzzleModalId) return;
        const puzzle = game.rooms.flatMap(r => r.puzzles).find(p => p.id === solvePuzzleModalId);
        if (puzzle) {
            const formattedAttempt = puzzleAttempt.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (formattedAttempt === puzzle.answer) {
                handlePuzzleToggle(solvePuzzleModalId, true);
                setSolvePuzzleModalId(null);
            } else {
                setSolveError("Incorrect answer.");
            }
        }
    }, [game, solvePuzzleModalId, puzzleAttempt, handlePuzzleToggle]);

    const handleActionImageToggle = useCallback((actionId: string, show: boolean) => {
         updateGameState(draft => {
            draft.rooms.forEach(r => {
                r.objects.forEach(o => o.showImageOverlay = false);
                r.puzzles.forEach(p => p.showImageOverlay = false);
                (r.actions || []).forEach(a => {
                    if (a.id !== actionId) a.showImageOverlay = false;
                });
            });
            for (const room of draft.rooms) {
                const a = (room.actions || []).find(a => a.id === actionId);
                if (a) {
                    a.showImageOverlay = show;
                    return;
                }
            }
        });
    }, [updateGameState]);

    const handleActionCompleteToggle = useCallback((actionId: string, isComplete: boolean) => {
        updateGameState(draft => {
            for (const room of draft.rooms) {
                const a = (room.actions || []).find(a => a.id === actionId);
                if (a) {
                    a.isComplete = isComplete;
                    return;
                }
            }
        });
    }, [updateGameState]);

    const handleToggleDescription = useCallback((id: string) => {
        setVisibleObjectDescriptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    if (status === 'loading') {
        return <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white">Loading Presenter View...</div>;
    }
    
    if (status === 'error' || !game || !currentRoom) {
        return <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white">Could not load game. It may be private or does not exist.</div>;
    }
    
    const availableObjectsInRoom = currentRoom.objects.filter(obj => !(obj.showInInventory || (obj.wasEverInInventory && game.discardMode === 'discard_pile')));
    
    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">
            <FontLoader gameId={id} />
             {solvePuzzleModalId && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6 text-slate-100">Solve Puzzle</h2>
                        {solveError && <p className="text-red-400 mb-4">{solveError}</p>}
                        <form onSubmit={handleSolveModalSubmit}>
                            <input
                                type="text"
                                value={puzzleAttempt}
                                onChange={e => setPuzzleAttempt(e.target.value)}
                                placeholder="Enter answer"
                                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                autoFocus
                            />
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setSolvePuzzleModalId(null)} className="px-4 py-2 bg-slate-600 text-slate-100 rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <h1 className="text-lg font-bold text-brand-400 truncate">{game.title}</h1>
                    <p className="text-xs text-slate-400">Presenter View</p>
                </div>
                <nav className="flex-1 overflow-y-auto">
                    {Object.entries(roomsByAct).map(([act, rooms]) => {
                         const actNumber = parseInt(act, 10);
                         const isActLocked = lockingPuzzlesByActNumber.has(actNumber);
                         const isCollapsed = collapsedActs[actNumber];

                        return (
                             <div key={act} className="border-b border-slate-700 last:border-b-0">
                                <button
                                    onClick={() => setCollapsedActs(prev => ({...prev, [actNumber]: !prev[actNumber]}))}
                                    className="w-full text-left font-semibold text-slate-400 p-3 flex justify-between items-center hover:bg-slate-700/50"
                                    disabled={isActLocked}
                                >
                                    <span className="flex items-center gap-2">
                                        {isActLocked && <Icon as="lock" className="w-4 h-4 text-red-500" title={`Locked by: ${lockingPuzzlesByActNumber.get(actNumber)}`} />}
                                        Act {act}
                                    </span>
                                    <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                                </button>
                                {!isCollapsed && rooms.map(room => {
                                    const isLocked = lockingPuzzlesByRoomId.has(room.id);
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => handleGoToRoom(room.originalIndex)}
                                            disabled={isLocked}
                                            className={`w-full text-left p-3 pl-6 text-sm flex items-center gap-2 
                                                ${room.originalIndex === currentRoomIndex ? 'bg-brand-900/50 text-brand-300' : 'hover:bg-slate-700/50'}
                                                ${isLocked ? 'text-slate-500 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {isLocked ? <Icon as="lock" className="w-4 h-4 text-red-500" title={`Locked by: ${lockingPuzzlesByRoomId.get(room.id)}`} /> : <div className="w-4 h-4"></div>}
                                            <span className="truncate">{room.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>
            </aside>
            
            <main className="flex-1 flex flex-col">
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">{currentRoom.name}</h2>
                         {lockingPuzzlesByRoomSolveId.has(currentRoom.id) && !currentRoom.isSolved && (
                            <div className="flex items-center gap-1 text-sm text-red-500" title={`Room solved state locked by: ${lockingPuzzlesByRoomSolveId.get(currentRoom.id)}`}>
                                <Icon as="lock" className="w-4 h-4" />
                                <span>Solved State Locked</span>
                            </div>
                        )}
                    </div>
                     <div className="flex items-center gap-2">
                         <a href={`/game/present/${game.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm">
                            <Icon as="present" className="w-4 h-4"/>
                            Open Player View
                        </a>
                        <Link to={`/editor/${game.id}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm">
                            <Icon as="edit" className="w-4 h-4"/>
                            Back to Editor
                        </Link>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Objects in this Room</h3>
                        <div className="space-y-4">
                            {availableObjectsInRoom.length > 0 ? availableObjectsInRoom.map(obj => (
                                <ObjectItem 
                                    key={obj.id}
                                    obj={obj}
                                    onToggle={handleObjectToggle}
                                    onToggleImage={handleObjectImageToggle}
                                    onToggleInRoomImage={handleObjectInRoomImageToggle}
                                    onToggleDescription={handleToggleDescription}
                                    isDescriptionVisible={visibleObjectDescriptions.has(obj.id)}
                                    lockingPuzzleName={lockingPuzzlesByObjectId.get(obj.id)}
                                />
                            )) : <p className="text-sm text-slate-400 italic">No available objects in this room.</p>}
                        </div>
                    </section>

                     <section className="space-y-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Player Actions & Host Responses</h3>
                            <div className="space-y-4">
                                {(currentRoom.actions || []).map(action => (
                                    <ActionItem 
                                        key={action.id}
                                        action={action}
                                        onToggleImage={handleActionImageToggle}
                                        onToggleComplete={handleActionCompleteToggle}
                                        isLocked={lockingPuzzlesByActionId.has(action.id)}
                                        lockingPuzzleName={lockingPuzzlesByActionId.get(action.id)}
                                    />
                                ))}
                                {(currentRoom.actions || []).length === 0 && <p className="text-sm text-slate-400 italic">No actions in this room.</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Puzzles in this Room</h3>
                             <div className="space-y-4">
                                {currentRoom.puzzles.map(puzzle => (
                                    <PuzzleItem
                                        key={puzzle.id}
                                        puzzle={puzzle}
                                        onToggle={handlePuzzleToggle}
                                        onToggleImage={handlePuzzleImageToggle}
                                        onAttemptSolve={handleAttemptSolvePuzzle}
                                        isLocked={lockingPuzzlesByPuzzleId.has(puzzle.id)}
                                        lockingPuzzleName={lockingPuzzlesByPuzzleId.get(puzzle.id)}
                                    />
                                ))}
                                {currentRoom.puzzles.length === 0 && <p className="text-sm text-slate-400 italic">No puzzles in this room.</p>}
                            </div>
                        </div>
                    </section>

                    <section>
                         <h3 className="text-lg font-semibold mb-4">Inventory</h3>
                         <div className="space-y-4">
                            {inventoryObjects.length > 0 ? inventoryObjects.map(obj => (
                                 <ObjectItem 
                                    key={obj.id}
                                    obj={obj}
                                    onToggle={handleObjectToggle}
                                    onToggleImage={handleObjectImageToggle}
                                    onToggleDescription={handleToggleDescription}
                                    isDescriptionVisible={visibleObjectDescriptions.has(obj.id)}
                                    showVisibilityToggle={true}
                                />
                            )) : <p className="text-sm text-slate-400 italic">Inventory is empty.</p>}
                         </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default PresenterView;
