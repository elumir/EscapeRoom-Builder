

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType } from '../types';
import Icon from '../components/Icon';
import Room from '../components/Slide';

const Dashboard: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGames = async () => {
            const data = await gameService.getGames();
            setGames(data);
        };
        fetchGames();
    }, []);

    const handleCreateGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || isCreating) return;

        setIsCreating(true);
        setError(null);

        try {
            const newGame = await gameService.createGame(newTitle.trim());
            setIsModalOpen(false);
            setNewTitle('');
            setGames(prev => [newGame, ...prev]);
            navigate(`/editor/${newGame.id}`);
        } catch (err) {
            console.error("Creation failed:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsCreating(false);
        }
    };
    
    const openModal = () => {
        setIsModalOpen(true);
        setNewTitle('');
        setError(null);
    };


    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this game?')) {
            const success = await gameService.deleteGame(id);
            if (success) {
                setGames(games.filter(p => p.id !== id));
            } else {
                alert('Failed to delete game. Please try again.');
            }
        }
    };
    
    const fallbackRoom: RoomType = {
        id: 'dummy', 
        name: 'Empty', 
        image: null, 
        mapImage: null,
        notes: '', 
        backgroundColor: '#eee', 
        objects: [],
        puzzles: [],
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <header className="bg-white dark:bg-slate-800 shadow-md">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Escape Builder</h1>
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
                    >
                        <Icon as="plus" className="w-5 h-5" />
                        New Game
                    </button>
                </div>
            </header>
            <main className="container mx-auto px-6 py-8">
                <h2 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Your Games</h2>
                {games.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {games.map(g => {
                           const inventoryItems = g.rooms
                             .flatMap(r => r.objects)
                             .filter(t => t.showInInventory)
                             .map(t => t.name);
                            
                           // For dashboard preview, show all map images to see the composite
                           const allMapImages = g.rooms.map(r => r.mapImage).filter(Boolean);

                            return (
                                <div key={g.id} className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                    <Link to={`/editor/${g.id}`} className="block">
                                        <div className="p-2">
                                          <Room 
                                            room={g.rooms[0] || fallbackRoom}
                                            inventoryItems={inventoryItems}
                                            visibleMapImages={allMapImages}
                                          />
                                        </div>
                                        <h3 className="text-lg font-semibold px-4 pt-2 truncate text-slate-800 dark:text-slate-200">{g.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 px-4 pb-4">{g.rooms.length} room(s)</p>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(g.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600"
                                        aria-label="Delete game"
                                    >
                                        <Icon as="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No games yet.</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Click "New Game" to get started!</p>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">Create New Game</h2>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Error: </strong>
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}
                        <form onSubmit={handleCreateGame}>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Enter game title"
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                autoFocus
                            />
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreating} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:bg-brand-400 disabled:cursor-not-allowed">
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;