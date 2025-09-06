import React, { useState, useEffect, useCallback, useMemo, ChangeEvent, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import { generateRoomDescription } from '../services/aiService';
import type { Game, Room as RoomType, InventoryObject, Puzzle, Action, Asset } from '../types';
import { generateUUID } from '../utils/uuid';
import Icon from '../components/Icon';
import Room from '../components/Slide';
import Accordion from '../components/Accordion';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AudioPreviewPlayer from '../components/AudioPreviewPlayer';

type Status = 'loading' | 'success' | 'error' | 'saving';
type ActiveItem = { type: 'object' | 'puzzle' | 'action'; id: string };

// Debounce hook for auto-saving
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetPickerCallback, setAssetPickerCallback] = useState<(assetId: string) => void>(() => () => {});
  const [assetFilter, setAssetFilter] = useState<'image' | 'audio' | 'all'>('all');

  const isInitialLoad = useRef(true);
  const debouncedGame = useDebounce(game, 2000);

  const fetchGame = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    isInitialLoad.current = true;
    const data = await gameService.getGame(id);
    if (data) {
      setGame(data);
      if (data.rooms.length > 0) {
        setActiveRoomId(data.rooms[0].id);
      }
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [id]);

  const fetchAssets = useCallback(async () => {
    if (!id) return;
    const assetData = await gameService.getAssetsForGame(id);
    setAssets(assetData);
  }, [id]);

  useEffect(() => {
    fetchGame();
    fetchAssets();
  }, [fetchGame, fetchAssets]);
  
  const handleSave = useCallback(async (gameToSave: Game | null = game) => {
      if (!gameToSave) return;
      setStatus('saving');
      try {
        await gameService.saveGame(gameToSave);
        setStatus('success');
      } catch (error) {
        console.error("Failed to save game:", error);
        setStatus('error');
        alert("Error saving game. Check console for details.");
      }
  }, [game]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (debouncedGame) {
      handleSave(debouncedGame);
    }
  }, [debouncedGame, handleSave]);


  const updateGame = useCallback((updater: (draft: Game) => Game | void) => {
    setGame(currentGame => {
      if (!currentGame) return null;
      const nextState = updater(currentGame);
      return nextState || currentGame;
    });
  }, []);

  const handleAddRoom = () => {
    const newRoom: RoomType = {
        id: generateUUID(),
        name: `New Room ${game ? game.rooms.length + 1 : 1}`,
        image: null, mapImage: null, notes: '', backgroundColor: '#000000',
        isFullScreenImage: false, act: 1, objects: [], puzzles: [], actions: [],
        isSolved: false, solvedImage: null, solvedNotes: '',
        objectRemoveIds: [], objectRemoveText: '',
    };
    updateGame(draft => {
        draft.rooms.push(newRoom);
    });
    setActiveRoomId(newRoom.id);
  };

  const handleDeleteRoom = (roomId: string) => {
      if (!game || !window.confirm("Are you sure you want to delete this room? This cannot be undone.")) return;
      
      const roomToDelete = game.rooms.find(r => r.id === roomId);
      if (!roomToDelete) return;
      
      const updatedRooms = game.rooms.filter(r => r.id !== roomId);
      
      // Also remove any puzzle locks pointing to this room
      updatedRooms.forEach(room => {
          room.puzzles.forEach(puzzle => {
              puzzle.lockedRoomIds = (puzzle.lockedRoomIds || []).filter(id => id !== roomId);
              puzzle.lockedRoomSolveIds = (puzzle.lockedRoomSolveIds || []).filter(id => id !== roomId);
          });
      });

      updateGame(draft => {
        draft.rooms = updatedRooms;
      });

      if (activeRoomId === roomId) {
          setActiveRoomId(updatedRooms.length > 0 ? updatedRooms[0].id : null);
      }
  };

  const handleActiveRoomChange = (prop: keyof RoomType, value: any) => {
    updateGame(draft => {
        const room = draft.rooms.find(r => r.id === activeRoomId);
        if (room) {
            (room as any)[prop] = value;
        }
    });
  };

  const activeRoom = useMemo(() => game?.rooms.find(r => r.id === activeRoomId), [game, activeRoomId]);
  
  const openAssetPicker = (filter: 'image' | 'audio', callback: (assetId: string) => void) => {
    setAssetFilter(filter);
    setAssetPickerCallback(() => callback);
    setIsAssetModalOpen(true);
  };

  const handleAssetSelected = (assetId: string) => {
    assetPickerCallback(assetId);
    setIsAssetModalOpen(false);
  };
  
  const handleFileUpload = async (file: File) => {
    if (!id) return;
    try {
        await gameService.uploadAsset(id, file);
        await fetchAssets();
    } catch (error) {
        console.error("Failed to upload asset:", error);
        alert("Failed to upload asset. See console for details.");
    }
  };

  const handleGameVisibilityChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!game) return;
    const newVisibility = e.target.checked ? 'public' : 'private';
    updateGame(draft => {
      draft.visibility = newVisibility;
    });
    try {
      await gameService.updateGameVisibility(game.id, newVisibility);
    } catch (error) {
       console.error("Failed to update visibility", error);
       alert("Could not update game visibility.");
       // Revert optimistic update on failure
       updateGame(draft => {
         draft.visibility = newVisibility === 'public' ? 'private' : 'public';
       });
    }
  };

  if (status === 'loading') {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">Loading editor...</div>;
  }

  if (status === 'error' || !game) {
    return <div className="h-screen w-screen flex items-center justify-center bg-red-50 text-red-700">Error loading game.</div>;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* Sidebar */}
        <aside className="w-64 h-full bg-white dark:bg-slate-800 flex flex-col flex-shrink-0 border-r border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <input
                    type="text"
                    value={game.title}
                    onChange={(e) => updateGame(draft => { draft.title = e.target.value })}
                    className="text-lg font-bold bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-2 py-1"
                />
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {game.rooms.map(room => (
                    <button
                        key={room.id}
                        onClick={() => setActiveRoomId(room.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                            activeRoomId === room.id
                                ? 'bg-brand-600 text-white font-semibold'
                                : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span className="truncate">{room.name}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                            className="p-1 rounded-full text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100"
                            title="Delete Room"
                        >
                          <Icon as="trash" className="w-4 h-4" />
                        </button>
                    </button>
                ))}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleAddRoom} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    <Icon as="plus" className="w-5 h-5" /> Add Room
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h2 className="text-xl font-semibold truncate">
                    {activeRoom ? activeRoom.name : 'No Room Selected'}
                </h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <span>Public</span>
                        <input
                            type="checkbox"
                            checked={game.visibility === 'public'}
                            onChange={handleGameVisibilityChange}
                            className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <div className="text-sm text-slate-500">
                        {status === 'saving' ? 'Saving...' : status === 'success' ? 'Saved' : 'Unsaved Changes'}
                    </div>
                    <button onClick={() => handleSave()} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Save</button>
                    <button onClick={() => window.open(`/game/presenter/${game.id}`, '_blank')} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
                        <Icon as="present" className="w-5 h-5" /> Present
                    </button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
              {/* Editor Panel */}
              <div className="flex-1 overflow-y-auto p-6">
                  {activeRoom ? (
                      <RoomEditor
                          key={activeRoom.id}
                          room={activeRoom}
                          game={game}
                          onRoomChange={handleActiveRoomChange}
                          updateGame={updateGame}
                          openAssetPicker={openAssetPicker}
                      />
                  ) : (
                      <div className="text-center text-slate-500">Select a room to start editing, or add a new one.</div>
                  )}
              </div>
              {/* Preview Panel */}
              <div className="w-1/3 min-w-[400px] bg-slate-200 dark:bg-slate-950 p-6 flex-shrink-0 overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
                  {activeRoom && (
                      <Room
                          room={activeRoom}
                          inventoryObjects={[]}
                          visibleMapImages={[activeRoom.mapImage]}
                          globalBackgroundColor={game.globalBackgroundColor}
                      />
                  )}
              </div>
            </div>
        </main>
        
        {isAssetModalOpen && (
            <AssetModal
                assets={assets}
                filter={assetFilter}
                onClose={() => setIsAssetModalOpen(false)}
                onSelect={handleAssetSelected}
                onUpload={handleFileUpload}
                onRefresh={fetchAssets}
            />
        )}
    </div>
  );
};

const RoomEditor: React.FC<{
  room: RoomType;
  game: Game;
  onRoomChange: (prop: keyof RoomType, value: any) => void;
  updateGame: (updater: (draft: Game) => any) => void;
  openAssetPicker: (filter: 'image' | 'audio', callback: (assetId: string) => void) => void;
}> = ({ room, game, onRoomChange, updateGame, openAssetPicker }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const newDescription = await generateRoomDescription(room.name, room.notes);
            onRoomChange('notes', newDescription);
        } catch (error) {
            alert((error as Error).message || "Failed to generate description.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Simplified handler for items
    const handleItemChange = (itemType: 'objects' | 'puzzles' | 'actions', itemId: string, prop: string, value: any) => {
        updateGame(draft => {
            const roomToUpdate = draft.rooms.find(r => r.id === room.id);
            if (roomToUpdate) {
                const items = roomToUpdate[itemType] as any[];
                const itemToUpdate = items.find(i => i.id === itemId);
                if (itemToUpdate) {
                    itemToUpdate[prop] = value;
                }
            }
        });
    };
    
    const handleAddItem = (itemType: 'objects' | 'puzzles' | 'actions') => {
        const base = { id: generateUUID(), name: 'New Item', showImageOverlay: false };
        let newItem: any;
        if (itemType === 'objects') {
            newItem = { ...base, description: '', showInInventory: false, image: null, nameColor: null };
        } else if (itemType === 'puzzles') {
            newItem = { ...base, answer: '', isSolved: false, unsolvedText: '', solvedText: '', image: null, sound: null, lockedObjectIds: [], discardObjectIds: [], lockedRoomIds: [], lockedPuzzleIds: [], lockedRoomSolveIds: [], lockedActionIds: [], completedActionIds: [], autoAddLockedObjects: false };
        } else { // actions
            newItem = { ...base, description: '', image: null, sound: null, isComplete: false };
        }
        updateGame(draft => {
            draft.rooms.find(r => r.id === room.id)?.[itemType].push(newItem);
        });
    };

    const handleDeleteItem = (itemType: 'objects' | 'puzzles' | 'actions', itemId: string) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        updateGame(draft => {
            const r = draft.rooms.find(r => r.id === room.id);
            if (r) {
                (r[itemType] as any[]) = (r[itemType] as any[]).filter(i => i.id !== itemId);
            }
        });
    };

    return (
        <div className="space-y-6">
            <Accordion title="Room Settings" defaultOpen>
                <div className="grid grid-cols-2 gap-4">
                    <input value={room.name} onChange={e => onRoomChange('name', e.target.value)} placeholder="Room Name" className="col-span-2 p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
                    <div className="col-span-2 relative">
                        <textarea value={room.notes} onChange={e => onRoomChange('notes', e.target.value)} placeholder="Room Notes (Markdown supported)" rows={6} className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
                        <button onClick={handleGenerateDescription} disabled={isGenerating} className="absolute bottom-2 right-2 px-2 py-1 bg-brand-500 text-white text-xs rounded hover:bg-brand-600 disabled:bg-slate-400">
                           {isGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                    </div>
                     <AssetSelectorButton label="Room Image" assetId={room.image} onClear={() => onRoomChange('image', null)} onSelect={() => openAssetPicker('image', assetId => onRoomChange('image', assetId))} />
                     <AssetSelectorButton label="Map Image" assetId={room.mapImage} onClear={() => onRoomChange('mapImage', null)} onSelect={() => openAssetPicker('image', assetId => onRoomChange('mapImage', assetId))} />
                </div>
            </Accordion>
            
            <ItemEditor
                title="Objects"
                items={room.objects}
                renderItem={(item) => <ObjectDetail item={item} onChange={(p, v) => handleItemChange('objects', item.id, p, v)} openAssetPicker={openAssetPicker} />}
                onAdd={() => handleAddItem('objects')}
                onDelete={(id) => handleDeleteItem('objects', id)}
            />
            
            <ItemEditor
                title="Puzzles"
                items={room.puzzles}
                renderItem={(item) => <PuzzleDetail item={item} game={game} room={room} onChange={(p, v) => handleItemChange('puzzles', item.id, p, v)} openAssetPicker={openAssetPicker} />}
                onAdd={() => handleAddItem('puzzles')}
                onDelete={(id) => handleDeleteItem('puzzles', id)}
            />
            
             <ItemEditor
                title="Actions"
                items={room.actions}
                renderItem={(item) => <ActionDetail item={item} onChange={(p, v) => handleItemChange('actions', item.id, p, v)} openAssetPicker={openAssetPicker} />}
                onAdd={() => handleAddItem('actions')}
                onDelete={(id) => handleDeleteItem('actions', id)}
            />

        </div>
    );
}

const ItemEditor: React.FC<{
    title: string;
    items: {id: string, name: string}[];
    renderItem: (item: any) => React.ReactNode;
    onAdd: () => void;
    onDelete: (id: string) => void;
}> = ({ title, items, renderItem, onAdd, onDelete }) => {
    const [openItemId, setOpenItemId] = useState<string | null>(null);
    const openItem = items.find(i => i.id === openItemId);
    return (
         <Accordion title={title} headerContent={<span className="text-sm font-normal bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>}>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                        <button onClick={() => setOpenItemId(item.id)} className="flex-grow text-left">{item.name}</button>
                        <button onClick={() => onDelete(item.id)} className="p-1 rounded-full text-slate-400 hover:bg-red-500 hover:text-white"><Icon as="trash" className="w-4 h-4"/></button>
                    </div>
                ))}
                 <button onClick={onAdd} className="w-full text-sm mt-2 p-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600">Add {title}</button>
            </div>
            {openItem && (
                <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center" onClick={() => setOpenItemId(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">{openItem.name}</h3>
                            <button onClick={() => setOpenItemId(null)}><Icon as="close" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">{renderItem(openItem)}</div>
                    </div>
                </div>
            )}
        </Accordion>
    );
};

// Details components for each item type
const ObjectDetail: React.FC<{item: InventoryObject, onChange: (p:string,v:any)=>void, openAssetPicker: Function}> = ({item, onChange, openAssetPicker}) => (
    <div className="space-y-4">
        <input value={item.name} onChange={e => onChange('name', e.target.value)} placeholder="Object Name" className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
        <textarea value={item.description} onChange={e => onChange('description', e.target.value)} placeholder="Description" rows={3} className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
        <AssetSelectorButton label="Object Image" assetId={item.image} onClear={() => onChange('image', null)} onSelect={() => openAssetPicker('image', (id:string) => onChange('image', id))} />
    </div>
);

const PuzzleDetail: React.FC<{item: Puzzle, game: Game, room: RoomType, onChange: (p:string,v:any)=>void, openAssetPicker: Function}> = ({item, game, room, onChange, openAssetPicker}) => {
    const allRooms = game.rooms;
    const allPuzzles = game.rooms.flatMap(r => r.puzzles);
    const allObjects = game.rooms.flatMap(r => r.objects);
    const allActions = game.rooms.flatMap(r => r.actions);

    const handleLockChange = (key: keyof Puzzle, id: string, checked: boolean) => {
        const currentIds = (item[key] as string[] || []);
        const newIds = checked ? [...currentIds, id] : currentIds.filter(i => i !== id);
        onChange(key, newIds);
    };

    return (
        <div className="space-y-4">
            <input value={item.name} onChange={e => onChange('name', e.target.value)} placeholder="Puzzle Name" className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
            <input value={item.answer} onChange={e => onChange('answer', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder="Answer (optional, simple text)" className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
            <textarea value={item.unsolvedText} onChange={e => onChange('unsolvedText', e.target.value)} placeholder="Unsolved Text" rows={3} className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
            <textarea value={item.solvedText} onChange={e => onChange('solvedText', e.target.value)} placeholder="Solved Text" rows={3} className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
            <div className="grid grid-cols-2 gap-4">
              <AssetSelectorButton label="Puzzle Image" assetId={item.image} onClear={() => onChange('image', null)} onSelect={() => openAssetPicker('image', (id:string) => onChange('image', id))} />
              <AssetSelectorButton label="Puzzle Sound" assetId={item.sound} onClear={() => onChange('sound', null)} onSelect={() => openAssetPicker('audio', (id:string) => onChange('sound', id))} />
            </div>
            <Accordion title="Locking Logic">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <LockSelector title="Locks Rooms" items={allRooms} selectedIds={item.lockedRoomIds || []} onToggle={(id, c) => handleLockChange('lockedRoomIds', id, c)} />
                    <LockSelector title="Locks Puzzles" items={allPuzzles.filter(p => p.id !== item.id)} selectedIds={item.lockedPuzzleIds || []} onToggle={(id, c) => handleLockChange('lockedPuzzleIds', id, c)} />
                    <LockSelector title="Locks Objects" items={allObjects} selectedIds={item.lockedObjectIds || []} onToggle={(id, c) => handleLockChange('lockedObjectIds', id, c)} />
                    <LockSelector title="Locks Actions" items={allActions} selectedIds={item.lockedActionIds || []} onToggle={(id, c) => handleLockChange('lockedActionIds', id, c)} />
                </div>
            </Accordion>
        </div>
    );
};

const LockSelector: React.FC<{title: string, items: {id:string, name:string}[], selectedIds: string[], onToggle: (id: string, checked: boolean) => void}> = ({title, items, selectedIds, onToggle}) => (
    <div className="space-y-1">
        <h4 className="font-semibold mb-1">{title}</h4>
        <div className="max-h-32 overflow-y-auto space-y-1 p-2 border dark:border-slate-600 rounded">
            {items.map(i => (
                <label key={i.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.includes(i.id)} onChange={e => onToggle(i.id, e.target.checked)} />
                    <span>{i.name}</span>
                </label>
            ))}
        </div>
    </div>
);

const ActionDetail: React.FC<{item: Action, onChange: (p:string,v:any)=>void, openAssetPicker: Function}> = ({item, onChange, openAssetPicker}) => (
     <div className="space-y-4">
        <input value={item.name} onChange={e => onChange('name', e.target.value)} placeholder="Action Name (e.g., 'Look under the rug')" className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
        <textarea value={item.description} onChange={e => onChange('description', e.target.value)} placeholder="Description/Result of Action" rows={3} className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded"/>
         <div className="grid grid-cols-2 gap-4">
            <AssetSelectorButton label="Action Image" assetId={item.image} onClear={() => onChange('image', null)} onSelect={() => openAssetPicker('image', (id:string) => onChange('image', id))} />
            <AssetSelectorButton label="Action Sound" assetId={item.sound} onClear={() => onChange('sound', null)} onSelect={() => openAssetPicker('audio', (id:string) => onChange('sound', id))} />
        </div>
        <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={item.hideCompleteButton} onChange={e => onChange('hideCompleteButton', e.target.checked)} />
            <span>Hide 'Complete' button in presenter view (for passive actions)</span>
        </label>
    </div>
);

const AssetSelectorButton: React.FC<{label:string, assetId: string | null, onSelect: ()=>void, onClear:()=>void}> = ({label, assetId, onSelect, onClear}) => {
    const assetName = "Asset selected"; // In a real app, you'd fetch the name.
    return (
        <div>
            <span className="text-sm font-medium">{label}</span>
            {assetId ? (
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-grow p-2 bg-slate-200 dark:bg-slate-700 rounded truncate text-sm">{assetId}</div>
                    <button onClick={onClear} className="p-1"><Icon as="close" className="w-4 h-4"/></button>
                </div>
            ) : (
                <button onClick={onSelect} className="w-full mt-1 p-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600">Select...</button>
            )}
        </div>
    );
};

const AssetModal: React.FC<{
    assets: Asset[],
    filter: 'image' | 'audio' | 'all',
    onClose: () => void,
    onSelect: (assetId: string) => void,
    onUpload: (file: File) => Promise<void>,
    onRefresh: () => void
}> = ({ assets, filter, onClose, onSelect, onUpload, onRefresh }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        await onUpload(file);
        setIsUploading(false);
    };

    const filteredAssets = assets.filter(a => filter === 'all' || a.mime_type.startsWith(filter));

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold">Asset Library</h3>
                    <div className="flex items-center gap-4">
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:bg-slate-400">
                           {isUploading ? 'Uploading...' : 'Upload New'}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,audio/*"/>
                        <button onClick={onClose}><Icon as="close" /></button>
                    </div>
                </header>
                <main className="p-4 flex-grow overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredAssets.map(asset => (
                            <button key={asset.id} onClick={() => onSelect(asset.id)} className="aspect-square border dark:border-slate-700 rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-1 hover:ring-2 hover:ring-brand-500">
                                {asset.mime_type.startsWith('image/') ? (
                                    <img src={`${gameService.API_BASE_URL}/assets/${asset.id}`} alt={asset.name} className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Icon as="audio" className="w-10 h-10" />
                                        <span className="text-xs break-all">{asset.name}</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {filteredAssets.length === 0 && <p className="text-slate-500 text-center">No {filter} assets found.</p>}
                </main>
            </div>
        </div>
    );
};


export default Editor;
