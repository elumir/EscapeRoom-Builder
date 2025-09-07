import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType, Puzzle, InventoryObject, Action, Asset } from '../types';
import Icon from '../components/Icon';
import Room from '../components/Slide';
import { generateUUID } from '../utils/uuid';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AudioPreviewPlayer from '../components/AudioPreviewPlayer';
import Accordion from '../components/Accordion';

type ModalState = 
  | { type: 'object', data: InventoryObject, roomId: string }
  | { type: 'puzzle', data: Puzzle, roomId: string }
  | { type: 'action', data: Action, roomId: string }
  | null;

const NAME_COLORS = [
    { name: 'Default', value: null, bg: 'bg-slate-400 dark:bg-slate-600', border: 'border-slate-500' },
    { name: 'White', value: 'bg-gray-200 text-gray-800 dark:bg-gray-300 dark:text-gray-900', bg: 'bg-gray-200', border: 'border-gray-400' },
    { name: 'Green', value: 'bg-green-500 text-white', bg: 'bg-green-500', border: 'border-green-600' },
    { name: 'Yellow', value: 'bg-amber-500 text-white', bg: 'bg-amber-500', border: 'border-amber-600' },
    { name: 'Blue', value: 'bg-blue-500 text-white', bg: 'bg-blue-500', border: 'border-blue-600' },
    { name: 'Red', value: 'bg-red-500 text-white', bg: 'bg-red-500', border: 'border-red-600' },
    { name: 'Cyan', value: 'bg-cyan-500 text-white', bg: 'bg-cyan-500', border: 'border-cyan-600' },
    { name: 'Magenta', value: 'bg-pink-500 text-white', bg: 'bg-pink-500', border: 'border-pink-600' },
];

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'objects' | 'puzzles' | 'actions'>('objects');
  const [editingItem, setEditingItem] = useState<ModalState>(null);
  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalCallback, setAssetModalCallback] = useState<(assetId: string | null) => void>(() => () => {});
  const [assetFilter, setAssetFilter] = useState<'image' | 'audio' | 'all'>('all');
  const [previewSolved, setPreviewSolved] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      if (!id) return;
      setIsLoading(true);
      const data = await gameService.getGame(id);
      setGame(data);
      if (data && data.rooms.length > 0) {
        setSelectedRoomId(data.rooms[0].id);
      }
      const assets = await gameService.getAssetsForGame(id);
      setAssetLibrary(assets);
      setIsLoading(false);
    };
    fetchGame();
  }, [id]);

  const handleSave = useCallback((updatedGame: Game) => {
    setGame(updatedGame);
    gameService.saveGame(updatedGame);
  }, []);

  const handleUpdateRoom = (roomId: string, updates: Partial<RoomType>) => {
    if (!game) return;
    const updatedRooms = game.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r);
    handleSave({ ...game, rooms: updatedRooms });
  };
  
  const handleAddItem = (roomId: string, itemType: 'objects' | 'puzzles' | 'actions') => {
    if (!game) return;
    const room = game.rooms.find(r => r.id === roomId);
    if (!room) return;

    let newItem: InventoryObject | Puzzle | Action;
    if (itemType === 'objects') {
        newItem = { id: generateUUID(), name: 'New Object', description: '', image: null, showImageOverlay: false, showInInventory: false, wasEverInInventory: false };
    } else if (itemType === 'puzzles') {
        newItem = { id: generateUUID(), name: 'New Puzzle', unsolvedText: '', solvedText: '', answer: null, image: null, showImageOverlay: false, isSolved: false, sound: null, autoAddLockedObjects: false, lockedObjectIds: [] };
    } else { // actions
        newItem = { id: generateUUID(), name: 'New Action', description: '', image: null, showImageOverlay: false, isComplete: false, sound: null };
    }

    const updatedRoom = { ...room, [itemType]: [...(room[itemType] || []), newItem] };
    const updatedRooms = game.rooms.map(r => r.id === roomId ? updatedRoom : r);
    handleSave({ ...game, rooms: updatedRooms });
  };
  
  const handleUpdateItem = (roomId: string, itemType: 'objects' | 'puzzles' | 'actions', itemId: string, updates: any) => {
    if (!game) return;
    const room = game.rooms.find(r => r.id === roomId);
    if (!room) return;

    const items = room[itemType] || [];
    const updatedItems = items.map((item: any) => item.id === itemId ? { ...item, ...updates } : item);
    const updatedRoom = { ...room, [itemType]: updatedItems };
    const updatedRooms = game.rooms.map(r => r.id === roomId ? updatedRoom : r);
    handleSave({ ...game, rooms: updatedRooms });
  };
  
  const handleDeleteItem = (roomId: string, itemType: 'objects' | 'puzzles' | 'actions', itemId: string) => {
    if (!game) return;
    if (!window.confirm(`Are you sure you want to delete this ${itemType.slice(0, -1)}?`)) return;

    const room = game.rooms.find(r => r.id === roomId);
    if (!room) return;
    
    const items = room[itemType] || [];
    const updatedItems = items.filter((item: any) => item.id !== itemId);
    const updatedRoom = { ...room, [itemType]: updatedItems };
    const updatedRooms = game.rooms.map(r => r.id === roomId ? updatedRoom : r);
    
    // Also remove any locks this item might have on other things
    let finalGame = { ...game, rooms: updatedRooms };
    if (itemType === 'puzzles') {
        finalGame.rooms = finalGame.rooms.map(r => ({
            ...r,
            puzzles: r.puzzles.map(p => {
                const updatedPuzzle = { ...p };
                if (updatedPuzzle.lockedPuzzleIds?.includes(itemId)) {
                    updatedPuzzle.lockedPuzzleIds = updatedPuzzle.lockedPuzzleIds.filter(id => id !== itemId);
                }
                 if (updatedPuzzle.lockedRoomIds?.includes(itemId)) {
                    updatedPuzzle.lockedRoomIds = updatedPuzzle.lockedRoomIds.filter(id => id !== itemId);
                }
                // ... etc for all lock types
                return updatedPuzzle;
            })
        }));
    }

    handleSave(finalGame);
  };
  
  const handleAddRoom = () => {
    if (!game) return;
    const newRoom: RoomType = {
        id: generateUUID(),
        name: `New Room ${game.rooms.length + 1}`,
        image: null,
        mapImage: null,
        notes: '',
        backgroundColor: '#000000',
        isFullScreenImage: false,
        isSolved: false,
        solvedImage: null,
        solvedNotes: '',
        act: 1,
        objects: [],
        puzzles: [],
        actions: [],
        transitionType: 'none',
        transitionDuration: 1,
    };
    const updatedGame = { ...game, rooms: [...game.rooms, newRoom] };
    handleSave(updatedGame);
    setSelectedRoomId(newRoom.id);
  };
  
  const openAssetModal = (callback: (assetId: string | null) => void, type: 'image' | 'audio' | 'all' = 'all') => {
    setAssetFilter(type);
    setAssetModalCallback(() => callback);
    setIsAssetModalOpen(true);
  };

  const selectedRoom = useMemo(() => {
    if (!game || !selectedRoomId) return null;
    return game.rooms.find(r => r.id === selectedRoomId);
  }, [game, selectedRoomId]);

  if (isLoading) {
    return <div className="h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">Loading editor...</div>;
  }

  if (!game) {
    return <div className="h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">Game not found.</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-md p-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
            <Icon as="prev" className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{game.title}</h1>
        </div>
        <div className="flex items-center gap-4">
            <Link to={`/settings/${game.id}`} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">
                <Icon as="settings" className="w-4 h-4" />
                <span>Settings</span>
            </Link>
            <a href={`/game/presenter/${game.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
                <Icon as="present" className="w-4 h-4" />
                <span>Present</span>
            </a>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Left Pane: Room List */}
        <div className="col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Rooms</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {game.rooms.map(room => (
                    <button key={room.id} onClick={() => setSelectedRoomId(room.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${selectedRoomId === room.id ? 'bg-brand-600 text-white font-bold' : 'bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        {room.name}
                    </button>
                ))}
            </div>
            <button onClick={handleAddRoom} className="w-full flex items-center justify-center gap-2 p-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">
                <Icon as="plus" className="w-5 h-5" /> Add Room
            </button>
        </div>
        {/* Middle Pane: Editor */}
        <div className="col-span-6 bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-y-auto p-6">
            {selectedRoom ? (
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium">Room Name</label>
                        <input type="text" value={selectedRoom.name} onChange={e => handleUpdateRoom(selectedRoom.id, { name: e.target.value })}
                            className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"/>
                    </div>
                    <Accordion title="Imagery & Layout">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Main Image</label>
                                <div onClick={() => openAssetModal(assetId => handleUpdateRoom(selectedRoom.id, { image: assetId }), 'image')}
                                    className="mt-1 aspect-video w-full bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
                                    {selectedRoom.image ? <img src={`${gameService.API_BASE_URL}/assets/${selectedRoom.image}`} className="w-full h-full object-cover"/> : <Icon as="gallery" className="w-8 h-8 text-slate-400"/>}
                                </div>
                            </div>
                             <div>
                                <label className="text-sm font-medium">Solved Image</label>
                                <div onClick={() => openAssetModal(assetId => handleUpdateRoom(selectedRoom.id, { solvedImage: assetId }), 'image')}
                                    className="mt-1 aspect-video w-full bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
                                    {selectedRoom.solvedImage ? <img src={`${gameService.API_BASE_URL}/assets/${selectedRoom.solvedImage}`} className="w-full h-full object-cover"/> : <Icon as="gallery" className="w-8 h-8 text-slate-400"/>}
                                </div>
                            </div>
                        </div>
                         <div className="mt-4">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedRoom.isFullScreenImage} onChange={e => handleUpdateRoom(selectedRoom.id, { isFullScreenImage: e.target.checked })}
                                className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"/>
                                Fullscreen Main Image (hides map and inventory)
                            </label>
                        </div>
                    </Accordion>
                    <Accordion title="Notes & Descriptions">
                       <div>
                            <label className="text-sm font-medium">Notes (Unsolved State)</label>
                             <textarea value={selectedRoom.notes} onChange={e => handleUpdateRoom(selectedRoom.id, { notes: e.target.value })}
                                className="w-full mt-1 p-2 h-24 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 font-mono text-sm"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Notes (Solved State)</label>
                             <textarea value={selectedRoom.solvedNotes} onChange={e => handleUpdateRoom(selectedRoom.id, { solvedNotes: e.target.value })}
                                className="w-full mt-1 p-2 h-24 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 font-mono text-sm"/>
                        </div>
                    </Accordion>
                     <Accordion title="Room Transition">
                        <div className="flex items-center gap-4">
                             <div>
                                <label className="text-sm font-medium">Transition Type</label>
                                <select value={selectedRoom.transitionType || 'none'} onChange={e => handleUpdateRoom(selectedRoom.id, { transitionType: e.target.value as any})}
                                    className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700">
                                    <option value="none">Instant Cut</option>
                                    <option value="fade">Crossfade</option>
                                </select>
                            </div>
                            {selectedRoom.transitionType === 'fade' && (
                                <div>
                                    <label className="text-sm font-medium">Fade Duration (seconds)</label>
                                    <input type="number" value={selectedRoom.transitionDuration || 1} min="0.1" max="10" step="0.1"
                                        onChange={e => handleUpdateRoom(selectedRoom.id, { transitionDuration: parseFloat(e.target.value) })}
                                        className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"/>
                                </div>
                            )}
                        </div>
                    </Accordion>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                         <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <button onClick={() => setActiveTab('objects')} className={`px-4 py-2 text-sm ${activeTab === 'objects' ? 'border-b-2 border-brand-500 font-semibold' : 'text-slate-500'}`}>Objects</button>
                            <button onClick={() => setActiveTab('puzzles')} className={`px-4 py-2 text-sm ${activeTab === 'puzzles' ? 'border-b-2 border-brand-500 font-semibold' : 'text-slate-500'}`}>Puzzles</button>
                            <button onClick={() => setActiveTab('actions')} className={`px-4 py-2 text-sm ${activeTab === 'actions' ? 'border-b-2 border-brand-500 font-semibold' : 'text-slate-500'}`}>Actions</button>
                         </div>
                         <div className="mt-4 space-y-2">
                            {(selectedRoom[activeTab] || []).map((item: any) => (
                                <div key={item.id} className="p-2 border border-slate-200 dark:border-slate-700 rounded-md flex justify-between items-center">
                                    <span>{item.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => alert('Editing will be here.')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Icon as="edit" className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteItem(selectedRoom.id, activeTab, item.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded"><Icon as="trash" className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                             <button onClick={() => handleAddItem(selectedRoom.id, activeTab)} className="w-full mt-2 text-sm p-2 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">
                                Add {activeTab.slice(0, -1)}
                            </button>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-slate-500">Select a room to start editing.</div>
            )}
        </div>
        {/* Right Pane: Preview */}
        <div className="col-span-4 flex flex-col gap-4">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Live Preview</h2>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <span>Solved</span>
                    <input type="checkbox" checked={previewSolved} onChange={e => setPreviewSolved(e.target.checked)} className="sr-only peer"/>
                     <div className="relative w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
             </div>
             <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-md flex items-center justify-center p-2">
                {selectedRoom ? (
                    <Room 
                        room={{...selectedRoom, isSolved: previewSolved}}
                        inventoryObjects={game.rooms.flatMap(r => r.objects).filter(o => o.showInInventory)}
                        visibleMapImages={[selectedRoom.mapImage]}
                        globalBackgroundColor={game.globalBackgroundColor}
                    />
                ) : (
                    <div className="text-slate-400">No room selected</div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default Editor;
