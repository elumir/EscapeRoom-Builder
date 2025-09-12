import React, { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import { API_BASE_URL } from '../services/presentationService';
import type { Game, Room, InventoryObject, Puzzle, Action, Asset } from '../types';
import { generateUUID } from '../utils/uuid';
import Icon from '../components/Icon';
import Accordion from '../components/Accordion';
import MarkdownRenderer from '../components/MarkdownRenderer';

type Status = 'loading' | 'success' | 'error' | 'saving';
type EditorTab = 'room' | 'objects' | 'puzzles' | 'actions';

const useDebouncedCallback = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const debouncedCallback = useCallback((...args: any[]) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    return debouncedCallback;
};

const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [game, setGame] = useState<Game | null>(null);
    const [status, setStatus] = useState<Status>('loading');
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EditorTab>('room');

    const debouncedSave = useDebouncedCallback(async (gameToSave: Game) => {
        setStatus('saving');
        try {
            await gameService.saveGame(gameToSave);
            setStatus('success');
        } catch (error) {
            console.error("Failed to save game:", error);
            setStatus('error');
        }
    }, 1000);

    useEffect(() => {
        if (id) {
            const fetchGame = async () => {
                setStatus('loading');
                const data = await gameService.getGame(id);
                if (data) {
                    setGame(data);
                    if (data.rooms.length > 0) {
                        setSelectedRoomId(data.rooms[0].id);
                    }
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            };
            fetchGame();
        }
    }, [id]);

    const updateGame = useCallback((updatedGame: Game) => {
        setGame(updatedGame);
        debouncedSave(updatedGame);
    }, [debouncedSave]);

    const handleSelectRoom = (roomId: string) => {
        setSelectedRoomId(roomId);
        setActiveTab('room');
    };

    const handleAddRoom = () => {
        if (!game) return;
        const newRoom: Room = {
            id: generateUUID(),
            name: `New Room ${game.rooms.length + 1}`,
            image: null,
            mapImage: null,
            notes: '',
            backgroundColor: '#000000',
            isFullScreenImage: false,
            acts: [1],
            objects: [],
            puzzles: [],
            actions: [],
            isSolved: false,
            solvedImage: null,
            solvedNotes: '',
            objectRemoveIds: [],
            objectRemoveText: '',
        };
        const updatedGame = { ...game, rooms: [...game.rooms, newRoom] };
        updateGame(updatedGame);
        setSelectedRoomId(newRoom.id);
    };

    const selectedRoom = useMemo(() => {
        return game?.rooms.find(r => r.id === selectedRoomId) || null;
    }, [game, selectedRoomId]);

    if (status === 'loading' && !game) {
        return <div className="h-screen flex items-center justify-center">Loading editor...</div>;
    }

    if (status === 'error' || !game) {
        return <div className="h-screen flex items-center justify-center">Error: Game not found or access denied.</div>;
    }

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <aside className="w-72 bg-white dark:bg-slate-800 flex flex-col border-r border-slate-200 dark:border-slate-700">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h1 className="text-lg font-bold truncate text-brand-600 dark:text-brand-400">{game.title}</h1>
                     <div className="flex items-center gap-2 mt-2">
                        <Link to="/" className="text-xs text-slate-500 hover:underline">Dashboard</Link>
                        <span className="text-xs text-slate-400">/</span>
                        <Link to={`/settings/${game.id}`} className="text-xs text-slate-500 hover:underline">Settings</Link>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {(game.rooms || []).map(room => (
                        <button
                            key={room.id}
                            onClick={() => handleSelectRoom(room.id)}
                            className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${selectedRoomId === room.id ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                            <p className={`font-semibold ${selectedRoomId === room.id ? 'text-brand-700 dark:text-brand-300' : ''}`}>{room.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{room.objects.length} obj, {room.puzzles.length} puz</p>
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={handleAddRoom} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                        <Icon as="plus" className="w-5 h-5"/>
                        Add Room
                    </button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col">
                <header className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                    {selectedRoom ? (
                        <h2 className="text-xl font-bold">{selectedRoom.name}</h2>
                    ) : (
                        <h2 className="text-xl font-bold">No Room Selected</h2>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>Status: {status === 'saving' ? 'Saving...' : 'Saved'}</span>
                        {status === 'saving' && <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                    </div>
                     {selectedRoom && (
                        <nav className="flex rounded-lg bg-slate-200 dark:bg-slate-700/50 p-1">
                            {(['room', 'objects', 'puzzles', 'actions'] as EditorTab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`capitalize text-center text-sm px-4 py-1.5 rounded-md transition-colors ${
                                        activeTab === tab
                                        ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                    }`}
                                >{tab}</button>
                            ))}
                        </nav>
                     )}
                </header>
                <div className="flex-1 overflow-y-auto p-8">
                    {selectedRoom ? (
                        <div className="max-w-4xl mx-auto">
                            <p>Room Editor placeholder for "{selectedRoom.name}" - {activeTab} tab</p>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                            <p>Select a room from the list to begin editing,</p>
                            <p>or add a new room to get started.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Editor;
