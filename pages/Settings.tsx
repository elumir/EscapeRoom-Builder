import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Asset, SoundtrackTrack, SoundboardClip } from '../types';
import Icon from '../components/Icon';
import AudioPreviewPlayer from '../components/AudioPreviewPlayer';

type Status = 'loading' | 'success' | 'error';
type Section = 'general' | 'sharing' | 'appearance' | 'soundtrack' | 'soundboard' | 'fonts' | 'danger';

const Settings: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [game, setGame] = useState<Game | null>(null);
    const [status, setStatus] = useState<Status>('loading');
    const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
    const [activeSection, setActiveSection] = useState<Section>('general');
    const [copySuccess, setCopySuccess] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [assetModalTarget, setAssetModalTarget] = useState<'soundtrack' | 'soundboard' | null>(null);
    const [editingTrackName, setEditingTrackName] = useState<{ id: string; name: string } | null>(null);
    const [editingClipName, setEditingClipName] = useState<{ id: string; name: string } | null>(null);
    const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);
    const [dropTargetClipIndex, setDropTargetClipIndex] = useState<number | null>(null);


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
    
    const openAssetModal = (target: 'soundtrack' | 'soundboard') => {
        setAssetModalTarget(target);
        setIsAssetModalOpen(true);
    };

    const handleSelectAsset = (assetId: string) => {
        if (!game || !assetModalTarget) return;

        const asset = assetLibrary.find(a => a.id === assetId);
        if (!asset) return;

        if (assetModalTarget === 'soundtrack') {
            const newTrack: SoundtrackTrack = { id: asset.id, name: asset.name };
            const newSoundtrack = [...(game.soundtrack || []), newTrack];
            updateGame({ ...game, soundtrack: newSoundtrack });
        } else if (assetModalTarget === 'soundboard') {
            if (game.soundboard?.some(clip => clip.id === assetId)) {
                alert('This sound clip has already been added to the sound board.');
            } else {
                const newClip: SoundboardClip = { id: asset.id, name: asset.name };
                const newSoundboard = [...(game.soundboard || []), newClip];
                updateGame({ ...game, soundboard: newSoundboard });
            }
        }
        
        setIsAssetModalOpen(false);
    };

    const handleAudioUpload = async (file: File) => {
        if (!game || !assetModalTarget) return;
        try {
            const { assetId } = await gameService.uploadAsset(game.id, file);
            const updatedAssets = await gameService.getAssetsForGame(game.id);
            setAssetLibrary(updatedAssets);
            
            const newAsset = updatedAssets.find(a => a.id === assetId);
            if (newAsset) {
                handleSelectAsset(newAsset.id);
            }
            
            setIsAssetModalOpen(false);
    
        } catch (error) {
            console.error("Audio upload failed:", error);
            alert("Failed to upload audio file. Please try again.");
        }
    };

    const handleFontUpload = async (file: File) => {
        if (!game) return;
        try {
            await gameService.uploadAsset(game.id, file);
            const updatedAssets = await gameService.getAssetsForGame(game.id);
            setAssetLibrary(updatedAssets);
        } catch (error) {
            console.error("Font upload failed:", error);
            alert("Failed to upload font file. Please try again.");
        }
    };

    const handleDeleteFont = async (assetId: string) => {
        if (!game) return;
        if (window.confirm('Are you sure you want to delete this font?')) {
            const success = await gameService.deleteAsset(game.id, assetId);
            if (success) {
                setAssetLibrary(prev => prev.filter(a => a.id !== assetId));
                // If the deleted font was the active one, reset it
                if (game.fontFamily === assetLibrary.find(a => a.id === assetId)?.name) {
                    handleGamePropertyChange('fontFamily', null);
                }
            } else {
                alert('Failed to delete font.');
            }
        }
    };


    const handleRemoveSoundtrackTrack = (trackId: string) => {
        if (!game) return;
        const newSoundtrack = (game.soundtrack || []).filter(t => t.id !== trackId);
        updateGame({ ...game, soundtrack: newSoundtrack });
    };
    
    const handleRemoveSoundboardClip = (clipId: string) => {
        if (!game) return;
        const newSoundboard = (game.soundboard || []).filter(c => c.id !== clipId);
        updateGame({ ...game, soundboard: newSoundboard });
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

    const handleSaveClipName = () => {
        if (!game || !editingClipName) return;
        const originalClip = (game.soundboard || []).find(c => c.id === editingClipName.id);
        if (!originalClip || !editingClipName.name.trim() || editingClipName.name === originalClip.name) {
            setEditingClipName(null);
            return;
        }
        const newName = editingClipName.name.trim();
        const newSoundboard = (game.soundboard || []).map(clip =>
            clip.id === editingClipName.id ? { ...clip, name: newName } : clip
        );
        updateGame({ ...game, soundboard: newSoundboard });
        setEditingClipName(null);
    };

    const handleClipDragStart = (index: number) => {
        setDraggedClipIndex(index);
    };

    const handleClipDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedClipIndex !== null && draggedClipIndex !== index) {
            setDropTargetClipIndex(index);
        }
    };

    const handleClipDragLeave = () => {
        setDropTargetClipIndex(null);
    };

    const handleClipDrop = (index: number) => {
        if (draggedClipIndex === null || draggedClipIndex === index || !game) return;

        const newSoundboard = [...(game.soundboard || [])];
        const [removed] = newSoundboard.splice(draggedClipIndex, 1);
        newSoundboard.splice(index, 0, removed);

        handleGamePropertyChange('soundboard', newSoundboard);

        setDraggedClipIndex(null);
        setDropTargetClipIndex(null);
    };

    const handleClipDragEnd = () => {
        setDraggedClipIndex(null);
        setDropTargetClipIndex(null);
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
        { id: 'soundboard', name: 'Sound Board', icon: 'play' },
        { id: 'fonts', name: 'Fonts', icon: 'font' },
        { id: 'danger', name: 'Danger Zone', icon: 'trash' },
    ];

    const COLORS = ['#000000', '#ffffff', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];
    
    const fontAssets = assetLibrary.filter(asset => asset.mime_type.startsWith('font/'));

    if (status === 'loading') {
        return <div className="flex items-center justify-center h-screen">Loading settings...</div>;
    }
    
    if (status === 'error' || !game) {
        return <div className="flex items-center justify-center h-screen">Error: Game not found or you do not have permission to view its settings.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {isAssetModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Audio Library</h2>
                            <button onClick={() => setIsAssetModalOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                                <Icon as="close" className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="w-full cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors">
                                <Icon as="plus" className="w-5 h-5 mr-2" />
                                <span>Upload New Audio File</span>
                                <input type="file" className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
                            </label>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {assetLibrary.filter(asset => asset.mime_type.startsWith('audio/')).map(asset => (
                                <div key={asset.id} className="group rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-grow pr-2 break-words">{asset.name}</p>
                                            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                                                <AudioPreviewPlayer assetId={asset.id} variant="simple" />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSelectAsset(asset.id)}
                                        className="w-full text-center px-3 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 transition-colors"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <header className="bg-white dark:bg-slate-800 shadow-md p-2 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400 p-2">Settings: {game.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Link to={`/editor/${id}`} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                        <Icon as="edit" className="w-5 h-5" />
                        Back to Editor
                    </Link>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-white dark:bg-slate-800 p-4 border-r border-slate-200 dark:border-slate-700">
                    <nav className="space-y-1">
                        {SECTIONS.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md text-sm font-medium transition-colors ${
                                    activeSection === section.id
                                        ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Icon as={section.icon} className="w-5 h-5" />
                                <span>{section.name}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <div className="flex-1 overflow-y-auto p-8">
                    {activeSection === 'general' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">General Settings</h2>
                            <div className="max-w-xl space-y-6">
                                <div>
                                    <label htmlFor="gameTitle" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Game Title</label>
                                    <input
                                        id="gameTitle"
                                        type="text"
                                        value={game.title}
                                        onChange={e => handleGamePropertyChange('title', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Inventory Layout</label>
                                    <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700/50 p-1">
                                        <button
                                            onClick={() => handleGamePropertyChange('inventoryLayout', 'single')}
                                            className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                (game.inventoryLayout === 'single' || !game.inventoryLayout)
                                                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                            }`}
                                        >
                                            Single Inventory
                                        </button>
                                        <button
                                            onClick={() => handleGamePropertyChange('inventoryLayout', 'dual')}
                                            className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                game.inventoryLayout === 'dual'
                                                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                            }`}
                                        >
                                            Dual Inventories
                                        </button>
                                    </div>
                                    {game.inventoryLayout === 'dual' && (
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="inv1Title" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Inventory 1 Title</label>
                                                <input
                                                    id="inv1Title"
                                                    type="text"
                                                    value={game.inventory1Title || ''}
                                                    onChange={e => handleGamePropertyChange('inventory1Title', e.target.value)}
                                                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="inv2Title" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Inventory 2 Title</label>
                                                <input
                                                    id="inv2Title"
                                                    type="text"
                                                    value={game.inventory2Title || ''}
                                                    onChange={e => handleGamePropertyChange('inventory2Title', e.target.value)}
                                                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Discarded Object Behavior</label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        Choose what happens when an object is removed from the presenter's inventory.
                                    </p>
                                    <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700/50 p-1">
                                        <button
                                            onClick={() => handleGamePropertyChange('discardMode', 'discard_pile')}
                                            className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                (game.discardMode === 'discard_pile' || !game.discardMode)
                                                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                            }`}
                                        >
                                            Move to Discard Pile
                                        </button>
                                        <button
                                            onClick={() => handleGamePropertyChange('discardMode', 'return_to_room')}
                                            className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                game.discardMode === 'return_to_room'
                                                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                            }`}
                                        >
                                            Return to Original Room
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                      <input type="checkbox" className="rounded border-slate-400 text-brand-600 focus:ring-brand-500" checked={game.hideAvailableObjects || false} onChange={e => handleGamePropertyChange('hideAvailableObjects', e.target.checked)} />
                                      Hide the "Available to Pick Up" section for the presenter.
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'sharing' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Sharing & Visibility</h2>
                            <div className="max-w-xl space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-semibold">Game Visibility</h3>
                                <div className="flex items-center gap-4">
                                    <p className={`font-semibold text-lg ${game.visibility === 'public' ? 'text-sky-500' : 'text-slate-500'}`}>
                                        {game.visibility === 'public' ? 'Public' : 'Private'}
                                    </p>
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" checked={game.visibility === 'public'} onChange={e => handleVisibilityChange(e.target.checked)} className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                                    </label>
                                </div>
                                {game.visibility === 'public' ? (
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Anyone with the link can view and present this game.</p>
                                        <div className="flex gap-2">
                                            <input type="text" readOnly value={`${window.location.origin}/game/presenter/${game.id}`} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700/50" />
                                            <button onClick={handleCopyLink} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                                {copySuccess ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Only you can access and present this game.</p>
                                )}
                            </div>
                        </div>
                    )}
                    {activeSection === 'appearance' && (
                        <div>
                             <h2 className="text-2xl font-bold mb-6">Appearance</h2>
                            <div className="max-w-xl space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Global Background Color</label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Overrides individual room colors. Unselect to use per-room settings.</p>
                                    <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        {COLORS.map(color => (
                                            <button 
                                                key={color} 
                                                onClick={() => handleGamePropertyChange('globalBackgroundColor', game.globalBackgroundColor === color ? null : color)} 
                                                className={`w-8 h-8 rounded-full border-2 ${game.globalBackgroundColor === color ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`} 
                                                style={{backgroundColor: color}}
                                            />
                                        ))}
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Map Display Mode</label>
                                     <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700/50 p-1">
                                         <button
                                             onClick={() => handleGamePropertyChange('mapDisplayMode', 'layered')}
                                             className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                 (game.mapDisplayMode === 'layered' || !game.mapDisplayMode)
                                                 ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                                 : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                             }`}
                                         >
                                             Layered Maps
                                         </button>
                                         <button
                                             onClick={() => handleGamePropertyChange('mapDisplayMode', 'room-specific')}
                                             className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                                 game.mapDisplayMode === 'room-specific'
                                                 ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold'
                                                 : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                             }`}
                                         >
                                             Room-Specific Map
                                         </button>
                                     </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'soundtrack' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Soundtrack</h2>
                            <div className="max-w-xl space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Playback Mode</label>
                                    <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700/50 p-1">
                                        <button onClick={() => handleGamePropertyChange('soundtrackMode', 'sequential')} className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${(game.soundtrackMode === 'sequential' || !game.soundtrackMode) ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}>Sequential</button>
                                        <button onClick={() => handleGamePropertyChange('soundtrackMode', 'shuffle')} className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${game.soundtrackMode === 'shuffle' ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}>Shuffle</button>
                                        <button onClick={() => handleGamePropertyChange('soundtrackMode', 'loop')} className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${game.soundtrackMode === 'loop' ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}>Loop Current</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Volume: {Math.round((game.soundtrackVolume ?? 0.5) * 100)}%</label>
                                    <input type="range" min="0" max="1" step="0.05" value={game.soundtrackVolume ?? 0.5} onChange={e => handleGamePropertyChange('soundtrackVolume', parseFloat(e.target.value))} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tracks</label>
                                    <div className="space-y-2">
                                        {(game.soundtrack || []).map(track => (
                                            <div key={track.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                                                {editingTrackName?.id === track.id ? (
                                                    <input type="text" value={editingTrackName.name} onChange={(e) => setEditingTrackName({...editingTrackName, name: e.target.value})} onBlur={handleSaveTrackName} onKeyDown={e => e.key === 'Enter' && handleSaveTrackName()} autoFocus className="flex-grow bg-transparent text-sm font-semibold" />
                                                ) : (
                                                    <p onClick={() => setEditingTrackName({id: track.id, name: track.name})} className="flex-grow text-sm font-semibold cursor-pointer">{track.name}</p>
                                                )}
                                                <div className="ml-auto flex items-center gap-1">
                                                    <button onClick={() => handleRemoveSoundtrackTrack(track.id)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Icon as="trash" className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => openAssetModal('soundtrack')} className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm">Add Track</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'soundboard' && (
                        <div>
                             <h2 className="text-2xl font-bold mb-6">Sound Board</h2>
                              <div className="max-w-xl space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Clips</label>
                                    <div className="space-y-2">
                                        {(game.soundboard || []).map((clip, index) => (
                                            <div
                                                key={clip.id}
                                                draggable
                                                onDragStart={() => handleClipDragStart(index)}
                                                onDragOver={(e) => handleClipDragOver(e, index)}
                                                onDragLeave={handleClipDragLeave}
                                                onDrop={() => handleClipDrop(index)}
                                                onDragEnd={handleClipDragEnd}
                                                className={`relative flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-opacity ${draggedClipIndex === index ? 'opacity-50' : ''}`}
                                            >
                                                {dropTargetClipIndex === index && (
                                                    <div className={`absolute left-0 right-0 ${draggedClipIndex !== null && draggedClipIndex > index ? 'top-0' : 'bottom-0'} h-0.5 bg-brand-500`}></div>
                                                )}
                                                <div className="cursor-move touch-none text-slate-400 dark:text-slate-500">
                                                    <Icon as="reorder" className="w-5 h-5" />
                                                </div>
                                                {editingClipName?.id === clip.id ? (
                                                     <input type="text" value={editingClipName.name} onChange={(e) => setEditingClipName({...editingClipName, name: e.target.value})} onBlur={handleSaveClipName} onKeyDown={e => e.key === 'Enter' && handleSaveClipName()} autoFocus className="flex-grow bg-transparent text-sm font-semibold" />
                                                ) : (
                                                    <p onClick={() => setEditingClipName({id: clip.id, name: clip.name})} className="flex-grow text-sm font-semibold cursor-pointer">{clip.name}</p>
                                                )}
                                                <div className="ml-auto flex items-center gap-1">
                                                    <button onClick={() => handleRemoveSoundboardClip(clip.id)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Icon as="trash" className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => openAssetModal('soundboard')} className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm">Add Clip</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'fonts' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Fonts</h2>
                             <div className="max-w-xl space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Custom Fonts</label>
                                    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <label className="w-full cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors">
                                            <Icon as="plus" className="w-5 h-5 mr-2" />
                                            <span>Upload Font File (.ttf, .otf, .woff, .woff2)</span>
                                            <input type="file" className="hidden" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => e.target.files?.[0] && handleFontUpload(e.target.files[0])} />
                                        </label>
                                        <div className="mt-4 space-y-2">
                                            {fontAssets.map(font => (
                                                <div key={font.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                                    <span className="font-semibold text-sm">{font.name}</span>
                                                    <button onClick={() => handleDeleteFont(font.id)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full">
                                                        <Icon as="trash" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                 <div>
                                    <label htmlFor="fontFamily" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Active Font</label>
                                    <select
                                        id="fontFamily"
                                        value={game.fontFamily || ''}
                                        onChange={e => handleGamePropertyChange('fontFamily', e.target.value || null)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"
                                    >
                                        <option value="">Default (System Font)</option>
                                        {fontAssets.map(font => (
                                            <option key={font.id} value={font.name} style={{ fontFamily: `'${font.name}'` }}>
                                                {font.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSection === 'danger' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Danger Zone</h2>
                            <div className="max-w-xl p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg">
                                <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Delete This Game</h3>
                                <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                                    Once you delete this game, there is no going back. Please be certain. All associated rooms, puzzles, objects, and assets will be permanently removed.
                                </p>
                                <button onClick={handleDeleteGame} className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                                    Delete Game Permanently
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
// FIX: Add default export to the Settings component.
export default Settings;
