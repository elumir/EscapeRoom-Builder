import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType } from '../types';
import Icon from '../components/Icon';
import Room from '../components/Slide';
import { useAuth } from '../hooks/useAuth';

const GameCard = React.memo(({ game, fallbackRoom, onPresentClick }: { game: Game, fallbackRoom: RoomType, onPresentClick: (game: Game) => void }) => {
    const { firstRoom, previewProps } = useMemo(() => {
        const firstRoom = game.rooms[0] || fallbackRoom;
        const inventoryObjects = game.rooms.flatMap(r => r.objects).filter(t => t.showInInventory);
        const visibleMapImages = game.mapDisplayMode === 'room-specific'
            ? [firstRoom.mapImage].filter(Boolean)
            : game.rooms.map(r => r.mapImage).filter(Boolean);
        const inRoomObjects = firstRoom.objects.filter(obj => obj.showInRoomImage && obj.inRoomImage);
        
        return {
            firstRoom,
            previewProps: {
                inventoryObjects,
                visibleMapImages,
                inRoomObjects,
                globalBackgroundColor: game.globalBackgroundColor,
                inventoryLayout: game.inventoryLayout,
                inventory1Title: game.inventory1Title,
                inventory2Title: game.inventory2Title,
                fontFamily: game.fontFamily,
            }
        };
    }, [game, fallbackRoom]);

    return (
        <div className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
            <div>
                <Link to={`/editor/${game.id}`} className="block hover:opacity-90 transition-opacity">
                    <div className="aspect-video bg-slate-200 dark:bg-slate-700">
                        <Room room={firstRoom} {...previewProps} />
                    </div>
                    <div className="flex justify-between items-start px-4 pt-2">
                        <h3 className="text-lg font-semibold truncate text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">{game.title}</h3>
                        {game.visibility === 'public' && (
                            <span className="text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-0.5 rounded-full flex-shrink-0">
                                Public
                            </span>
                        )}
                    </div>
                </Link>
                <p className="text-sm text-slate-500 dark:text-slate-400 px-4 pb-2">{game.rooms.length} room(s)</p>
            </div>
            <div className="p-4">
                <button
                    onClick={() => onPresentClick(game)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
                >
                    <Icon as="present" className="w-5 h-5" />
                    Present
                </button>
            </div>
        </div>
    );
});

const Dashboard: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [presentModalGame, setPresentModalGame] = useState<Game | null>(null);
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        const fetchGames = async () => {
            if (!user) return; // Don't fetch if not logged in
            setIsLoading(true);
            const data = await gameService.getGames();
            setGames(data);
            setIsLoading(false);
        };
        fetchGames();
    }, [user]);

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

    const handlePresentClick = (game: Game) => {
        setPresentModalGame(game);
    };

    const handleResetAndPresent = async () => {
        if (!presentModalGame) return;

        const resetGame: Game = {
            ...presentModalGame,
            rooms: presentModalGame.rooms.map(room => ({
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
            visitedRoomIds: presentModalGame.rooms.length > 0 ? [presentModalGame.rooms[0].id] : [],
        };

        try {
            await gameService.saveGame(resetGame);
            setGames(prevGames => prevGames.map(g => g.id === resetGame.id ? resetGame : g));
            
            window.open(`/game/presenter/${presentModalGame.id}`, '_blank', 'noopener,noreferrer');
            
            setPresentModalGame(null); // Close modal
        } catch (err) {
            console.error("Failed to reset and save game:", err);
            alert("Failed to reset game state. Please try again.");
        }
    };
    
    const fallbackRoom: RoomType = {
        id: 'dummy', 
        name: 'Empty', 
        image: null, 
        mapImage: null,
        notes: '', 
        backgroundColor: '#eee', 
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
        transitionType: 'none',
        transitionDuration: 1,
    };

    const renderHeaderButtons = () => {
      if (isAuthLoading) {
        return <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>;
      }
      if (user) {
        return (
          <div className="flex items-center gap-4">
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
            >
              <Icon as="plus" className="w-5 h-5" />
              New Game
            </button>
            <div className="flex items-center gap-2">
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">{user.name}</span>
            </div>
            <a href="/game/logout" className="text-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400">
              Log Out
            </a>
          </div>
        );
      }
      return (
        <a href="/game/login" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow">
          Log In
        </a>
      );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <header className="bg-white dark:bg-slate-800 shadow-md">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Escape Builder</h1>
                    {renderHeaderButtons()}
                </div>
            </header>
            <main className="container mx-auto px-6 py-8">
                <h2 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Your Games</h2>
                {isLoading ? (
                    <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Loading games...</h3>
                    </div>
                ) : games.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {games.map(g => (
                            <GameCard 
                                key={g.id}
                                game={g}
                                fallbackRoom={fallbackRoom}
                                onPresentClick={handlePresentClick}
                            />
                        ))}
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

            {presentModalGame && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
                        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Start Presentation: {presentModalGame.title}</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Do you want to reset all puzzles, inventory, and visited rooms to their default state before starting?
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button 
                                type="button" 
                                onClick={() => setPresentModalGame(null)} 
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <a 
                                href={`/game/presenter/${presentModalGame.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={() => setPresentModalGame(null)}
                                className="px-4 py-2 text-center bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                            >
                                Present with Current State
                            </a>
                            <button 
                                type="button" 
                                onClick={handleResetAndPresent} 
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                            >
                                Reset and Present
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;