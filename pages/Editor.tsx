import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType, InventoryObject, Puzzle } from '../types';
import Room from '../components/Slide';
import Icon from '../components/Icon';
import PresenterPreview from '../components/PresenterPreview';
import Accordion from '../components/Accordion';
import { generateUUID } from '../utils/uuid';

type Status = 'loading' | 'success' | 'error';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [editingGameTitle, setEditingGameTitle] = useState('');
  const [editingRoomName, setEditingRoomName] = useState('');
  const [editingRoomNotes, setEditingRoomNotes] = useState('');
  const [editingRoomObjects, setEditingRoomObjects] = useState<InventoryObject[]>([]);
  const [editingRoomPuzzles, setEditingRoomPuzzles] = useState<Puzzle[]>([]);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [openPuzzleObjectsDropdown, setOpenPuzzleObjectsDropdown] = useState<string | null>(null);
  const [openPuzzleRoomsDropdown, setOpenPuzzleRoomsDropdown] = useState<string | null>(null);
  const [openPuzzlePuzzlesDropdown, setOpenPuzzlePuzzlesDropdown] = useState<string | null>(null);

  const objectsDropdownRef = useRef<HTMLDivElement>(null);
  const roomsDropdownRef = useRef<HTMLDivElement>(null);
  const puzzlesDropdownRef = useRef<HTMLDivElement>(null);
  const roomsContainerRef = useRef<HTMLDivElement>(null);
  const objectsContainerRef = useRef<HTMLDivElement>(null);
  const puzzlesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const fetchGame = async () => {
        setStatus('loading');
        const data = await gameService.getGame(id);
        if (data) {
          setGame(data);
          setEditingGameTitle(data.title);
          if (data.rooms.length > 0) {
              const currentRoom = data.rooms[0];
              setEditingRoomName(currentRoom.name);
              setEditingRoomNotes(currentRoom.notes);
              setEditingRoomObjects(currentRoom.objects || []);
              setEditingRoomPuzzles(currentRoom.puzzles || []);
          }
          setStatus('success');
        } else {
          setStatus('error');
        }
      };
      fetchGame();
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (objectsDropdownRef.current && !objectsDropdownRef.current.contains(event.target as Node)) {
            setOpenPuzzleObjectsDropdown(null);
        }
        if (roomsDropdownRef.current && !roomsDropdownRef.current.contains(event.target as Node)) {
            setOpenPuzzleRoomsDropdown(null);
        }
        if (puzzlesDropdownRef.current && !puzzlesDropdownRef.current.contains(event.target as Node)) {
            setOpenPuzzlePuzzlesDropdown(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updateGame = useCallback((updatedGame: Game) => {
    setGame(updatedGame);
    gameService.saveGame(updatedGame);
  }, []);

  useEffect(() => {
    if (game && game.title !== editingGameTitle) {
      const handler = setTimeout(() => {
        updateGame({ ...game, title: editingGameTitle });
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [editingGameTitle, game, updateGame]);

  const useDebouncedUpdater = <T,>(value: T, property: keyof RoomType) => {
    useEffect(() => {
        if (game) {
            const handler = setTimeout(() => {
                const currentRoom = game.rooms[selectedRoomIndex];
                if (currentRoom && JSON.stringify(currentRoom[property]) !== JSON.stringify(value)) {
                    const newRooms = [...game.rooms];
                    newRooms[selectedRoomIndex] = { ...currentRoom, [property]: value };
                    updateGame({ ...game, rooms: newRooms });
                }
            }, 500);
            return () => clearTimeout(handler);
        }
    }, [value, selectedRoomIndex, game, updateGame, property]);
  };
  
  useDebouncedUpdater(editingRoomName, 'name');
  useDebouncedUpdater(editingRoomNotes, 'notes');
  useDebouncedUpdater(editingRoomObjects, 'objects');
  useDebouncedUpdater(editingRoomPuzzles, 'puzzles');

  const selectRoom = (index: number) => {
    setSelectedRoomIndex(index);
    const room = game?.rooms[index];
    setEditingRoomName(room?.name || '');
    setEditingRoomNotes(room?.notes || '');
    setEditingRoomObjects(room?.objects || []);
    setEditingRoomPuzzles(room?.puzzles || []);
  };

  const addRoom = () => {
    if (!game) return;
    const newRoom: RoomType = { id: generateUUID(), name: `Room ${game.rooms.length + 1}`, image: null, mapImage: null, notes: '', backgroundColor: '#ffffff', objects: [], puzzles: [] };
    const newRooms = [...game.rooms, newRoom];
    updateGame({ ...game, rooms: newRooms });
    selectRoom(newRooms.length - 1);
    setTimeout(() => {
        roomsContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };
  
  const deleteRoom = () => {
    if (!game || game.rooms.length <= 1) {
      alert("You cannot delete the last room.");
      return;
    };
    if(window.confirm('Are you sure you want to delete this room?')){
        const newRooms = game.rooms.filter((_, i) => i !== selectedRoomIndex);
        const newIndex = Math.max(0, selectedRoomIndex - 1);
        updateGame({ ...game, rooms: newRooms });
        selectRoom(newIndex);
    }
  };
  
  const changeRoomColor = (color: string) => {
    if (!game) return;
    const newRooms = [...game.rooms];
    newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], backgroundColor: color };
    updateGame({ ...game, rooms: newRooms });
  }

  const handleFileUpload = async (file: File, property: 'image' | 'mapImage') => {
      if (!game) return;
      try {
          // TODO: Add a loading state indicator
          const { assetId } = await gameService.uploadAsset(game.id, file);
          const newRooms = [...game.rooms];
          newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], [property]: assetId };
          updateGame({ ...game, rooms: newRooms });
      } catch (error) {
          console.error(`${property} upload failed:`, error);
          alert(`Failed to upload ${property}. Please try again.`);
      }
  };

  const addObject = () => {
    const newObject: InventoryObject = { id: generateUUID(), name: 'New Object', description: 'Description...', showInInventory: false};
    setEditingRoomObjects([...editingRoomObjects, newObject]);
    setTimeout(() => {
        objectsContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }

  const handleObjectChange = (index: number, field: 'name' | 'description', value: string) => {
    const newObjects = [...editingRoomObjects];
    newObjects[index] = { ...newObjects[index], [field]: value };
    setEditingRoomObjects(newObjects);
  }

  const deleteObject = (index: number) => {
    setEditingRoomObjects(editingRoomObjects.filter((_, i) => i !== index));
  }

  const addPuzzle = () => {
    const newPuzzle: Puzzle = { id: generateUUID(), name: 'New Puzzle', isSolved: false, unsolvedText: '', solvedText: '', image: null, sound: null, showImageOverlay: false, lockedObjectIds: [], lockedRoomIds: [], lockedPuzzleIds: [], autoAddLockedObjects: false };
    setEditingRoomPuzzles([...editingRoomPuzzles, newPuzzle]);
    setTimeout(() => {
        puzzlesContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }

  const handlePuzzleChange = (index: number, field: keyof Puzzle, value: string | boolean | string[] | null) => {
    const newPuzzles = [...editingRoomPuzzles];
    newPuzzles[index] = { ...newPuzzles[index], [field]: value };
    setEditingRoomPuzzles(newPuzzles);
  }
  
  const handlePuzzleFileChange = async (index: number, field: 'image' | 'sound', file: File | null) => {
      if (!file) {
        handlePuzzleChange(index, field, null);
        return;
      }
      if (game) {
        try {
            // TODO: Add loading state
            const { assetId } = await gameService.uploadAsset(game.id, file);
            handlePuzzleChange(index, field, assetId);
        } catch (error) {
            console.error(`Puzzle ${field} upload failed:`, error);
            alert(`Failed to upload puzzle ${field}. Please try again.`);
        }
      }
  }

  const deletePuzzle = (index: number) => {
    setEditingRoomPuzzles(editingRoomPuzzles.filter((_, i) => i !== index));
  }

  const handleToggleObject = (objectId: string, newState: boolean) => {
    if (!game) return;
    const newRooms = game.rooms.map(room => ({
        ...room,
        objects: room.objects.map(obj => 
            obj.id === objectId ? { ...obj, showInInventory: newState } : obj
        )
    }));
    
    const currentRoom = newRooms[selectedRoomIndex];
    if (currentRoom.objects.some(obj => obj.id === objectId)) {
       setEditingRoomObjects(currentRoom.objects);
    }
    
    updateGame({ ...game, rooms: newRooms });
  }
  
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
    
    const shouldAutoAdd = newState && targetPuzzle.autoAddLockedObjects;
    const objectIdsToUpdate = shouldAutoAdd ? targetPuzzle.lockedObjectIds : [];

    const newRooms = game.rooms.map(room => {
        let newObjects = room.objects;
        // If this is the room with the puzzle AND we need to update objects
        if (room.id === targetRoomId && shouldAutoAdd) {
            newObjects = room.objects.map(obj => 
                objectIdsToUpdate.includes(obj.id) ? { ...obj, showInInventory: true } : obj
            );
        }

        const newPuzzles = room.puzzles.map(p => 
            p.id === puzzleId ? { ...p, isSolved: newState } : p
        );
        
        return { ...room, objects: newObjects, puzzles: newPuzzles };
    });

    const newGame = { ...game, rooms: newRooms };
    
    const updatedCurrentRoom = newGame.rooms[selectedRoomIndex];
    setEditingRoomPuzzles(updatedCurrentRoom.puzzles);
    setEditingRoomObjects(updatedCurrentRoom.objects);
    
    updateGame(newGame);
  };

  const handleTogglePuzzleImage = (puzzleId: string, newState: boolean) => {
    const newPuzzles = editingRoomPuzzles.map(p => {
        if (p.id === puzzleId) {
            return { ...p, showImageOverlay: newState };
        }
        // If turning one ON, turn all others OFF.
        if (newState) {
            return { ...p, showImageOverlay: false };
        }
        return p;
    });
    setEditingRoomPuzzles(newPuzzles);
  };

  const handleResetAndPresent = async () => {
    if (!game) return;

    const resetGame: Game = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            objects: room.objects.map(obj => ({
                ...obj,
                showInInventory: false,
            })),
            puzzles: room.puzzles.map(p => ({
                ...p,
                isSolved: false,
                showImageOverlay: false,
            })),
        })),
        visitedRoomIds: game.rooms.length > 0 ? [game.rooms[0].id] : [],
    };

    updateGame(resetGame);
    
    // Also update the local editing state to match
    const newCurrentRoom = resetGame.rooms[selectedRoomIndex];
    if (newCurrentRoom) {
      setEditingRoomObjects(newCurrentRoom.objects);
      setEditingRoomPuzzles(newCurrentRoom.puzzles);
    }

    window.open(`/game/presenter/${id}`, '_blank', 'noopener,noreferrer');
    
    setIsResetModalOpen(false);
  };


  const COLORS = ['#ffffff', '#000000', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading game...</div>;
  }
  
  if (status === 'error') {
     return <div className="flex items-center justify-center h-screen">Error: Game not found.</div>;
  }

  if (!game || !game.rooms[selectedRoomIndex]) {
    // This handles the case where game is loaded but has no rooms.
    return <div className="flex items-center justify-center h-screen">This game has no rooms.</div>;
  }

  const currentRoom = game.rooms[selectedRoomIndex];
  const inventoryItems = game.rooms
    .flatMap(r => r.objects)
    .filter(t => t.showInInventory)
    .map(t => t.name);
  
  // In the editor, we can see all potential map images layered
  const allMapImages = game.rooms.map(r => r.mapImage).filter(Boolean);

  return (
    <div className="flex flex-col h-screen bg-slate-200 dark:bg-slate-900">
       {isResetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Start Presentation</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Do you want to reset all puzzles, inventory, and visited rooms to their default state before starting?
                </p>
                <div className="mt-6 flex justify-end gap-4">
                    <button 
                        type="button" 
                        onClick={() => setIsResetModalOpen(false)} 
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <a 
                        href={`/game/presenter/${id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => setIsResetModalOpen(false)}
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
       {isPreviewExpanded && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="w-full h-full max-w-6xl max-h-[90vh] bg-slate-800 rounded-lg shadow-2xl">
                <PresenterPreview
                    game={game}
                    currentRoomIndex={selectedRoomIndex}
                    onToggleObject={handleToggleObject}
                    onTogglePuzzle={handleTogglePuzzle}
                    onTogglePuzzleImage={handleTogglePuzzleImage}
                    isExpanded={true}
                    onClose={() => setIsPreviewExpanded(false)}
                />
            </div>
        </div>
       )}
      <header className="bg-white dark:bg-slate-800 shadow-md p-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-brand-600 dark:text-brand-400 p-2">Studio</Link>
          <input 
            type="text" 
            value={editingGameTitle} 
            onChange={e => setEditingGameTitle(e.target.value)} 
            className="text-lg font-semibold bg-transparent rounded-md p-1 focus:bg-slate-100 dark:focus:bg-slate-700 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow">
            <Icon as="present" className="w-5 h-5" />
            Present
          </button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Thumbnails */}
        <aside className="w-48 bg-white dark:bg-slate-800 p-2 overflow-y-auto shadow-lg">
          <div className="space-y-2" ref={roomsContainerRef}>
            {game.rooms.map((room, index) => (
              <div key={room.id} onClick={() => selectRoom(index)} className={`cursor-pointer rounded-md overflow-hidden border-2 ${selectedRoomIndex === index ? 'border-brand-500' : 'border-transparent hover:border-brand-300'}`}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 p-1">{index + 1}</span>
                  <div className="flex-1 transform scale-[0.95] origin-top-left">
                     <Room room={room} inventoryItems={inventoryItems} visibleMapImages={allMapImages} className="shadow-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addRoom} className="w-full mt-4 flex items-center justify-center gap-2 p-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition">
             <Icon as="plus" className="w-4 h-4"/> Add Room
          </button>
        </aside>

        {/* Main Area - Editor */}
        <main className="flex-1 flex flex-col p-4 md:p-8 bg-slate-200 dark:bg-slate-900 overflow-y-auto">
            <div className='w-full max-w-4xl mx-auto'>
              <div className="relative w-full aspect-video">
                <Room room={currentRoom} inventoryItems={inventoryItems} visibleMapImages={allMapImages} />
                <div className="absolute inset-0 flex">
                  <div className="w-[70%] h-full group relative">
                      <label className="w-full h-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors duration-300">
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} className="sr-only" />
                          <div className="text-white text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              <p className="font-bold text-lg">{currentRoom.image ? "Change Image" : "Upload Image"}</p>
                              <p className="text-sm">Click or drag & drop</p>
                          </div>
                      </label>
                  </div>
                   <div className="w-[30%] h-full">
                     <div className="h-1/2 relative group">
                          <label className="w-full h-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors duration-300">
                              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'mapImage')} className="sr-only" />
                              <div className="text-white text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none p-2">
                                  <p className="font-bold text-sm">{currentRoom.mapImage ? "Change" : "Upload"}</p>
                                  <p className="text-xs">Map Image</p>
                              </div>
                          </label>
                     </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-3 text-slate-700 dark:text-slate-300">Objects</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2" ref={objectsContainerRef}>
                  {editingRoomObjects.length > 0 ? editingRoomObjects.map((obj, index) => (
                    <div key={obj.id} className="grid grid-cols-12 gap-2 items-center">
                      <input 
                        type="text" 
                        value={obj.name}
                        onChange={(e) => handleObjectChange(index, 'name', e.target.value)}
                        placeholder="Cue Name"
                        className="col-span-4 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                      />
                      <input 
                        type="text"
                        value={obj.description}
                        onChange={(e) => handleObjectChange(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="col-span-7 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                      />
                      <button onClick={() => deleteObject(index)} className="col-span-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full flex items-center justify-center">
                        <Icon as="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  )) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No objects for this room.</p>
                  )}
                </div>
                <button onClick={addObject} className="mt-3 flex items-center gap-2 text-sm px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 rounded-md hover:bg-brand-200 dark:hover:bg-brand-900">
                  <Icon as="plus" className="w-4 h-4"/> Add Object
                </button>
            </div>

            <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-3 text-slate-700 dark:text-slate-300">Puzzles</h3>
                 <div className="space-y-4 max-h-96 overflow-y-auto pr-2" ref={puzzlesContainerRef}>
                    {editingRoomPuzzles.length > 0 ? editingRoomPuzzles.map((puzzle, index) => (
                        <div key={puzzle.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <input 
                                    type="text" 
                                    value={puzzle.name}
                                    onChange={(e) => handlePuzzleChange(index, 'name', e.target.value)}
                                    placeholder="Puzzle Name"
                                    className="font-semibold px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm w-1/3"
                                />
                                <div className="flex items-center gap-2">
                                    <button onClick={() => deletePuzzle(index)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full flex items-center justify-center">
                                        <Icon as="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <textarea 
                                    value={puzzle.unsolvedText}
                                    onChange={(e) => handlePuzzleChange(index, 'unsolvedText', e.target.value)}
                                    placeholder="Unsolved Text"
                                    rows={3}
                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-none"
                                />
                                <textarea 
                                    value={puzzle.solvedText}
                                    onChange={(e) => handlePuzzleChange(index, 'solvedText', e.target.value)}
                                    placeholder="Solved Text"
                                    rows={3}
                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                               <div>
                                 <label className="block mb-1 text-slate-600 dark:text-slate-400">Image</label>
                                 {puzzle.image ? (
                                    <div className="flex items-center gap-2">
                                        <img src={`/api/assets/${puzzle.image}`} alt="Puzzle preview" className="w-16 h-16 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                                        <button onClick={() => handlePuzzleFileChange(index, 'image', null)} className="text-red-500 hover:text-red-700 text-xs">Clear</button>
                                    </div>
                                 ) : (
                                    <input type="file" accept="image/*" onChange={(e) => handlePuzzleFileChange(index, 'image', e.target.files?.[0] || null)} className="text-xs w-full" />
                                 )}
                               </div>
                               <div>
                                 <label className="block mb-1 text-slate-600 dark:text-slate-400">Sound</label>
                                 {puzzle.sound ? (
                                     <div className="flex items-center gap-2 text-xs">
                                        <span>Audio file uploaded.</span>
                                        <button onClick={() => handlePuzzleFileChange(index, 'sound', null)} className="text-red-500 hover:text-red-700">Clear</button>
                                    </div>
                                 ) : (
                                    <input type="file" accept="audio/*" onChange={(e) => handlePuzzleFileChange(index, 'sound', e.target.files?.[0] || null)} className="text-xs w-full"/>
                                 )}
                               </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Objects</h4>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setOpenPuzzleObjectsDropdown(openPuzzleObjectsDropdown === puzzle.id ? null : puzzle.id)}
                                                className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm"
                                            >
                                                <span>{`${puzzle.lockedObjectIds?.length || 0} object(s) selected`}</span>
                                                <svg className={`w-4 h-4 transition-transform ${openPuzzleObjectsDropdown === puzzle.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                            </button>
                                            {openPuzzleObjectsDropdown === puzzle.id && (
                                                <div ref={objectsDropdownRef} className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    <div className="space-y-1 p-2">
                                                        {game.rooms.map(room => (
                                                            <div key={room.id}>
                                                                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                                {room.objects.length > 0 ? (
                                                                    room.objects.map(obj => (
                                                                        <label key={obj.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pl-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md p-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                                                                checked={puzzle.lockedObjectIds?.includes(obj.id)}
                                                                                onChange={(e) => {
                                                                                    const newLockedIds = e.target.checked
                                                                                        ? [...(puzzle.lockedObjectIds || []), obj.id]
                                                                                        : (puzzle.lockedObjectIds || []).filter(id => id !== obj.id);
                                                                                    handlePuzzleChange(index, 'lockedObjectIds', newLockedIds);
                                                                                }}
                                                                            />
                                                                            {obj.name}
                                                                        </label>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs text-slate-500 italic pl-2">No objects in this room.</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Rooms</h4>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setOpenPuzzleRoomsDropdown(openPuzzleRoomsDropdown === puzzle.id ? null : puzzle.id)}
                                                className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm"
                                            >
                                                <span>{`${puzzle.lockedRoomIds?.length || 0} room(s) selected`}</span>
                                                <svg className={`w-4 h-4 transition-transform ${openPuzzleRoomsDropdown === puzzle.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                            </button>
                                            {openPuzzleRoomsDropdown === puzzle.id && (
                                                <div ref={roomsDropdownRef} className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    <div className="space-y-1 p-2">
                                                        {game.rooms.filter(room => room.id !== currentRoom.id).map(room => (
                                                            <label key={room.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pl-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md p-1">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                                                    checked={puzzle.lockedRoomIds?.includes(room.id)}
                                                                    onChange={(e) => {
                                                                        const newLockedIds = e.target.checked
                                                                            ? [...(puzzle.lockedRoomIds || []), room.id]
                                                                            : (puzzle.lockedRoomIds || []).filter(id => id !== room.id);
                                                                        handlePuzzleChange(index, 'lockedRoomIds', newLockedIds);
                                                                    }}
                                                                />
                                                                {room.name}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Puzzles</h4>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setOpenPuzzlePuzzlesDropdown(openPuzzlePuzzlesDropdown === puzzle.id ? null : puzzle.id)}
                                                className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm"
                                            >
                                                <span>{`${puzzle.lockedPuzzleIds?.length || 0} puzzle(s) selected`}</span>
                                                <svg className={`w-4 h-4 transition-transform ${openPuzzlePuzzlesDropdown === puzzle.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                            </button>
                                            {openPuzzlePuzzlesDropdown === puzzle.id && (
                                                <div ref={puzzlesDropdownRef} className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    <div className="space-y-1 p-2">
                                                        {game.rooms.map(room => (
                                                            <div key={room.id}>
                                                                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                                {room.puzzles.filter(p => p.id !== puzzle.id).length > 0 ? (
                                                                    room.puzzles.filter(p => p.id !== puzzle.id).map(p => (
                                                                        <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pl-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md p-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                                                                checked={puzzle.lockedPuzzleIds?.includes(p.id)}
                                                                                onChange={(e) => {
                                                                                    const newLockedIds = e.target.checked
                                                                                        ? [...(puzzle.lockedPuzzleIds || []), p.id]
                                                                                        : (puzzle.lockedPuzzleIds || []).filter(id => id !== p.id);
                                                                                    handlePuzzleChange(index, 'lockedPuzzleIds', newLockedIds);
                                                                                }}
                                                                            />
                                                                            {p.name}
                                                                        </label>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs text-slate-500 italic pl-2">No other puzzles in this room.</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <div className="mt-4">
                                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                        checked={puzzle.autoAddLockedObjects || false}
                                        onChange={(e) => handlePuzzleChange(index, 'autoAddLockedObjects', e.target.checked)}
                                    />
                                    <span>Automatically add its locked objects in this room to inventory upon solving.</span>
                                </label>
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No puzzles for this room.</p>
                    )}
                 </div>
                 <button onClick={addPuzzle} className="mt-3 flex items-center gap-2 text-sm px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 rounded-md hover:bg-brand-200 dark:hover:bg-brand-900">
                  <Icon as="plus" className="w-4 h-4"/> Add Puzzle
                </button>
            </div>
        </main>
        
        {/* Right Sidebar - Controls */}
        <aside className="w-80 bg-white dark:bg-slate-800 flex flex-col shadow-lg">
            <div className="flex-grow overflow-y-auto">
                <Accordion title="Room Properties" defaultOpen={true}>
                    <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Room Name</h3>
                          <input
                            type="text"
                            value={editingRoomName}
                            onChange={e => setEditingRoomName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Background Color</h3>
                          <div className="flex flex-wrap gap-2">
                            {COLORS.map(color => (
                              <button key={color} onClick={() => changeRoomColor(color)} className={`w-8 h-8 rounded-full border-2 ${currentRoom.backgroundColor === color ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-300 dark:border-slate-600'}`} style={{backgroundColor: color}}/>
                            ))}
                          </div>
                        </div>
                    </div>
                </Accordion>
                <Accordion title="Room Description">
                    <div className="space-y-3">
                        <textarea
                            value={editingRoomNotes}
                            onChange={e => setEditingRoomNotes(e.target.value)}
                            placeholder="Add room description here..."
                            className="w-full h-40 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        />
                    </div>
                </Accordion>
                 <Accordion title="Actions">
                     <button onClick={deleteRoom} className="w-full flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900 transition text-sm">
                        <Icon as="trash" className="w-4 h-4" /> Delete Current Room
                      </button>
                 </Accordion>
                 <Accordion title="Presenter Preview" defaultOpen={true}>
                    <div className="flex justify-end mb-2">
                        <button onClick={() => setIsPreviewExpanded(true)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 text-xs">
                            <Icon as="expand" className="w-3 h-3" />
                            Expand
                        </button>
                    </div>
                    <PresenterPreview 
                        game={game} 
                        currentRoomIndex={selectedRoomIndex} 
                        onToggleObject={handleToggleObject}
                        onTogglePuzzle={handleTogglePuzzle}
                        onTogglePuzzleImage={handleTogglePuzzleImage}
                        isExpanded={false}
                    />
                 </Accordion>
            </div>
        </aside>
      </div>
    </div>
  );
};

export default Editor;
