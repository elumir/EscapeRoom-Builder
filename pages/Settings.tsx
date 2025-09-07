import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Asset, SoundtrackTrack } from '../types';
import Icon from '../components/Icon';
import AudioPreviewPlayer from '../components/AudioPreviewPlayer';

type Status = 'loading' | 'success' | 'error';
type Section = 'general' | 'sharing' | 'appearance' | 'soundtrack' | 'danger';

const Settings: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [game, setGame] = useState<Game | null>(null);
    const [status, setStatus] = useState<Status>('loading');
    const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
    const [activeSection, setActiveSection] = useState<Section>('general');
    const [copySuccess, setCopySuccess] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingTrackName, setEditingTrackName] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (id) {
            const fetchGame = async () => {
                setStatus('loading');
                const data = await gameService.getGame(id);
                if (data) {
                    setGame(data);
                    const assets = await gameService.getAssetsForGame(id);
                    setAssetLibrary(assets);
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            };
            fetchGame();
        }
    }, [id]);

    const updateGame = (updatedGame: Game) => {
        setGame(updatedGame);
        gameService.saveGame(updatedGame);
    };

    const handleGamePropertyChange = (property: keyof Game, value: any) => {
        if (!game) return;
        updateGame({ ...game, [property]: value });
    };

    const handleVisibilityChange = async (isPublic: boolean) => {
        if (!game) return;
        const newVisibility = isPublic ? 'public' : 'private';
        try {
            await gameService.updateGameVisibility(game.id, newVisibility);
            setGame({ ...game, visibility: newVisibility });
        } catch (error) {
            console.error("Failed to update visibility:", error);
            alert("Could not update game visibility. Please try again.");
        }
    };
    
    const handleCopyLink = () => {
        if (!game || game.visibility !== 'public') return;
        const link = `${window.location.origin}/game/presenter/${game.id}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleSelectAssetForSoundtrack = (assetId: string) => {
        if (!game) return;
        const asset = assetLibrary.find(a => a.id === assetId);
        if (asset) {
            const newTrack: SoundtrackTrack = { id: asset.id, name: asset.name };
            const newSoundtrack = [...(game.soundtrack || []), newTrack];
            updateGame({ ...game, soundtrack: newSoundtrack });
        }
        setIsAssetModalOpen(false);
    };

    const handleSoundtrackUpload = async (file: File) => {
        if (!game) return;
        try {
            // 1. Upload the asset
            const { assetId } = await gameService.uploadAsset(game.id, file);
            
            // 2. Refresh the asset library to include the new asset
            const updatedAssets = await gameService.getAssetsForGame(game.id);
            setAssetLibrary(updatedAssets);
            
            // 3. Find the newly uploaded asset
            const newAsset = updatedAssets.find(a => a.id === assetId);
            if (newAsset) {
                // 4. Add it to the soundtrack
                const newTrack: SoundtrackTrack = { id: newAsset.id, name: newAsset.name };
                const newSoundtrack = [...(game.soundtrack || []), newTrack];
                handleGamePropertyChange('soundtrack', newSoundtrack);
            }
            
            // 5. Close the modal
            setIsAssetModalOpen(false);
    
        } catch (error) {
            console.error("Soundtrack upload failed:", error);
            alert("Failed to upload audio file. Please try again.");
        }
    };

    const handleRemoveSoundtrackTrack = (trackId: string) => {
        if (!game) return;
        const newSoundtrack = (game.soundtrack || []).filter(t => t.id !== trackId);
        updateGame({ ...game, soundtrack: newSoundtrack });
    };

    const handleSaveTrackName = () => {
        if (!game || !editingTrackName) return;

        const originalTrack = (game.soundtrack || []).find(t => t.id === editingTrackName.id);
        if (!originalTrack || !editingTrackName.name.trim() || editingTrackName.name === originalTrack.name) {
            setEditingTrackName(null);
            return;
        }

        const newName = editingTrackName.name.trim();
        const newSoundtrack = (game.soundtrack || []).map(track =>
            track.id === editingTrackName.id ? { ...track, name: newName } : track
        );
        updateGame({ ...game, soundtrack: newSoundtrack });
        setEditingTrackName(null);
    };

    const handleDeleteGame = async () => {
        if (!game) return;
        if (window.confirm('Are you absolutely sure you want to delete this game? This action is permanent and cannot be undone.')) {
            const success = await gameService.deleteGame(game.id);
            if (success) {
                navigate('/');
            } else {
                alert('Failed to delete game. Please try again.');
            }
        }
    };
    
    const SECTIONS: { id: Section, name: string, icon: React.ComponentProps<typeof Icon>['as'] }[] = [
        { id: 'general', name: 'General', icon: 'settings' },
        { id: 'sharing', name: 'Sharing', icon: 'share' },
        { id: 'appearance', name: 'Appearance', icon: 'swatch' },
        { id: 'soundtrack', name: 'Soundtrack', icon: 'audio' },
        { id: 'danger', name: 'Danger Zone', icon: 'trash' },
    ];

    const COLORS = ['#000000', '#ffffff', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];

    if (status === 'loading') {
        return <div className="flex items-center justify-center h-screen">Loading settings...</div>;
    }
    
    if (status === 'error' || !game) {
        return <div className="flex items-center justify-center h-screen">Error: Game not found or you do not have permission to view its settings.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
             {isAssetModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Audio Library</h2>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm">
                                    <Icon as="plus" className="w-4 h-4" />
                                    Upload New
                                    <input 
                                        type="file" 
                                        accept="audio/*" 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleSoundtrackUpload(e.target.files[0]);
                                            }
                                        }}
                                        className="sr-only"
                                    />
                                </label>
                                <button onClick={() => setIsAssetModalOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <Icon as="close" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {(() => {
                            const filteredAssets = assetLibrary.filter(asset => asset.mime_type.startsWith('audio/'));
                            if (filteredAssets.length > 0) {
                                return (
                                    <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {filteredAssets.map(asset => (
                                            <div key={asset.id} className="aspect-square group relative rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700" onClick={() => handleSelectAssetForSoundtrack(asset.id)}>
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-2 text-center">
                                                    <Icon as="audio" className="w-12 h-12 mb-2"/>
                                                    <p className="text-xs font-semibold">{asset.name}</p>
                                                </div>
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer">
                                                    <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">Select</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            return (
                                <div className="flex-grow flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <p>No audio assets uploaded for this game yet.</p>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}
            <header className="bg-white dark:bg-slate-800 shadow-md p-2 flex justify-between items-center z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link to={`/editor/${id}`} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                        <Icon as="prev" className="w-5 h-5" />
                        Back to Editor
                    </Link>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                    <h1 className="text-lg font-semibold">{game.title} - Settings</h1>
                </div>
            </header>
            <main className="flex-1 overflow-hidden p-8">
                <div className="mx-auto max-w-6xl h-full grid grid-cols-12 gap-8">
                    {/* Left Nav */}
                    <div className="col-span-3">
                        <nav className="space-y-1">
                            {SECTIONS.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                        activeSection === section.id
                                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                                            : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
                                    } ${section.id === 'danger' ? '!text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/50' : ''}`}
                                >
                                    <Icon as={section.icon} className="w-5 h-5" />
                                    <span>{section.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Right Content */}
                    <div className="col-span-9 bg-white dark:bg-slate-800 rounded-lg shadow p-8 overflow-y-auto">
                        {activeSection === 'general' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-700 pb-4">General Settings</h2>
                                <div>
                                    <label htmlFor="game-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Game Title</label>
                                    <input
                                        id="game-title"
                                        type="text"
                                        value={game.title}
                                        onChange={e => handleGamePropertyChange('title', e.target.value)}
                                        className="w-full max-w-md px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"
                                    />
                                </div>
                                 <div>
                                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Presenter View Options</h3>
                                    <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg max-w-md">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-400 text-brand-600 focus:ring-brand-500 w-4 h-4"
                                            checked={game.hideAvailableObjects || false}
                                            onChange={e => handleGamePropertyChange('hideAvailableObjects', e.target.checked)}
                                        />
                                        <span>Hide "Available to Pick Up" section because all objects are automatically picked up by puzzles.</span>
                                    </label>
                                </div>
                            </div>
                        )}
                        {activeSection === 'sharing' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-700 pb-4">Sharing & Visibility</h2>
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Game Visibility</h3>
                                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                            <span>Private</span>
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={game.visibility === 'public'}
                                                onChange={(e) => handleVisibilityChange(e.target.checked)}
                                            />
                                            <div className="relative w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                            <span>Public</span>
                                        </label>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                        {game.visibility === 'private' 
                                            ? 'Only you can present this game.' 
                                            : 'Anyone with the link can present this game. They cannot edit it or see your private notes.'
                                        }
                                    </p>
                                    {game.visibility === 'public' && (
                                        <div className="mt-4">
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Shareable Presenter Link</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`${window.location.origin}/game/presenter/${game.id}`}
                                                    className="w-full text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                />
                                                <button onClick={handleCopyLink} className="px-3 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 transition-colors w-24 text-center">
                                                    {copySuccess ? 'Copied!' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeSection === 'appearance' && (
                             <div className="space-y-6">
                                <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-700 pb-4">Appearance</h2>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Global Background Color</h3>
                                        {game.globalBackgroundColor && (
                                            <button 
                                                onClick={() => handleGamePropertyChange('globalBackgroundColor', null)}
                                                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                                            >
                                                Use Per-Room Colors
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                        Set one background color for all rooms. Clear it to use individual colors for each room.
                                    </p>
                                    <div className="flex flex-wrap gap-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                        {COLORS.map(color => (
                                            <button 
                                                key={color} 
                                                onClick={() => handleGamePropertyChange('globalBackgroundColor', color)} 
                                                className={`w-10 h-10 rounded-full border-2 ${game.globalBackgroundColor === color ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-300 dark:border-slate-600'}`} 
                                                style={{backgroundColor: color}}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Map Display Mode</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                        Choose how map images are shown to players.
                                    </p>
                                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700/50 p-1 max-w-sm">
                                        <button
                                            onClick={() => handleGamePropertyChange('mapDisplayMode', 'room-specific')}
                                            className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                game.mapDisplayMode === 'room-specific'
                                                ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-100 font-semibold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                            }`}
                                        >
                                            Room Specific
                                        </button>
                                        <button
                                            onClick={() => handleGamePropertyChange('mapDisplayMode', 'layered')}
                                            className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                (game.mapDisplayMode === 'layered' || !game.mapDisplayMode)
                                                ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-100 font-semibold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                            }`}
                                        >
                                            Layered
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSection === 'soundtrack' && (
                             <div className="space-y-6">
                                <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-700 pb-4">Soundtrack</h2>
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                        {(game.soundtrack || []).length > 0 ? (
                                            (game.soundtrack || []).map(track => (
                                                <div key={track.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Icon as="audio" className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                                        <div className="flex-grow min-w-0">
                                                            {editingTrackName?.id === track.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editingTrackName.name}
                                                                    onChange={(e) => setEditingTrackName({ ...editingTrackName, name: e.target.value })}
                                                                    onBlur={handleSaveTrackName}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            (e.target as HTMLInputElement).blur();
                                                                        }
                                                                        if (e.key === 'Escape') {
                                                                            setEditingTrackName(null);
                                                                        }
                                                                    }}
                                                                    className="w-full text-sm font-medium px-1 py-0.5 border border-brand-500 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                                                    autoFocus
                                                                    onFocus={(e) => e.target.select()}
                                                                />
                                                            ) : (
                                                                <p
                                                                    onClick={() => setEditingTrackName({ id: track.id, name: track.name })}
                                                                    className="text-sm truncate font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                                                                    title="Click to edit name"
                                                                >
                                                                    {track.name}
                                                                </p>
                                                            )}
                                                            <AudioPreviewPlayer assetId={track.id} />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleRemoveSoundtrackTrack(track.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ml-4">
                                                        <Icon as="trash" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4">No tracks added to the soundtrack.</p>
                                        )}
                                    </div>
                                    <button onClick={() => setIsAssetModalOpen(true)} className="w-full text-sm flex items-center justify-center gap-2 px-3 py-2 bg-brand-500/10 text-brand-700 dark:text-brand-300 dark:bg-brand-500/20 rounded-md hover:bg-brand-500/20 transition-colors">
                                        <Icon as="plus" className="w-4 h-4"/>
                                        Add Track from Library
                                    </button>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Playback Mode</label>
                                            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                                                <button onClick={() => handleGamePropertyChange('soundtrackMode', 'sequential')} className={`flex-1 text-center text-xs px-2 py-1 rounded-md transition-colors ${game.soundtrackMode !== 'shuffle' ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold' : 'hover:bg-white/50'}`}>Sequential</button>
                                                <button onClick={() => handleGamePropertyChange('soundtrackMode', 'shuffle')} className={`flex-1 text-center text-xs px-2 py-1 rounded-md transition-colors ${game.soundtrackMode === 'shuffle' ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold' : 'hover:bg-white/50'}`}>Shuffle</button>
                                            </div>
                                        </div>
                                        <div>
                                             <label htmlFor="soundtrackVolume" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Default Volume</label>
                                             <input
                                                id="soundtrackVolume"
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={game.soundtrackVolume ?? 0.5}
                                                onChange={e => handleGamePropertyChange('soundtrackVolume', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                             />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSection === 'danger' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold border-b border-red-500/30 pb-4 text-red-600 dark:text-red-400">Danger Zone</h2>
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                                    <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">Delete this Game</h3>
                                    <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                                        This action cannot be undone. This will permanently delete the game, all of its rooms, puzzles, objects, and uploaded assets.
                                    </p>
                                    <button
                                        onClick={handleDeleteGame}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300 shadow"
                                    >
                                        <Icon as="trash" className="w-5 h-5" />
                                        I understand, delete this game forever
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;