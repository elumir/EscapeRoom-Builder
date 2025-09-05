import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType, InventoryObject, Puzzle, Action } from '../types';
import Room from '../components/Slide';
import Icon from '../components/Icon';
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
  const [editingRoomAct, setEditingRoomAct] = useState(1);
  const [editingRoomNotes, setEditingRoomNotes] = useState('');
  const [editingRoomSolvedNotes, setEditingRoomSolvedNotes] = useState('');
  const [editingRoomObjects, setEditingRoomObjects] = useState<InventoryObject[]>([]);
  const [editingRoomPuzzles, setEditingRoomPuzzles] = useState<Puzzle[]>([]);
  const [editingRoomActions, setEditingRoomActions] = useState<Action[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [openPuzzleObjectsDropdown, setOpenPuzzleObjectsDropdown] = useState<string | null>(null);
  const [openPuzzleRoomsDropdown, setOpenPuzzleRoomsDropdown] = useState<string | null>(null);
  const [openPuzzlePuzzlesDropdown, setOpenPuzzlePuzzlesDropdown] = useState<string | null>(null);
  const [openPuzzleRoomSolvesDropdown, setOpenPuzzleRoomSolvesDropdown] = useState<string | null>(null);
  const [openObjectRemoveDropdown, setOpenObjectRemoveDropdown] = useState<boolean>(false);
  const [objectRemoveSearch, setObjectRemoveSearch] = useState('');
  const [draggedRoomIndex, setDraggedRoomIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [previewSolved, setPreviewSolved] = useState(false);


  const objectsDropdownRef = useRef<HTMLDivElement>(null);
  const roomsDropdownRef = useRef<HTMLDivElement>(null);
  const puzzlesDropdownRef = useRef<HTMLDivElement>(null);
  const roomSolvesDropdownRef = useRef<HTMLDivElement>(null);
  const objectRemoveDropdownRef = useRef<HTMLDivElement>(null);
  const roomsContainerRef = useRef<HTMLDivElement>(null);
  const objectsContainerRef = useRef<HTMLDivElement>(null);
  const puzzlesContainerRef = useRef<HTMLDivElement>(null);
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const solvedDescriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

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
              setEditingRoomSolvedNotes(currentRoom.solvedNotes || '');
              setEditingRoomAct(currentRoom.act || 1);
              setEditingRoomObjects(currentRoom.objects || []);
              setEditingRoomPuzzles(currentRoom.puzzles || []);
              setEditingRoomActions(currentRoom.actions || []);
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
        if (roomSolvesDropdownRef.current && !roomSolvesDropdownRef.current.contains(event.target as Node)) {
            setOpenPuzzleRoomSolvesDropdown(null);
        }
        if (objectRemoveDropdownRef.current && !objectRemoveDropdownRef.current.contains(event.target as Node)) {
            setOpenObjectRemoveDropdown(false);
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
  useDebouncedUpdater(editingRoomSolvedNotes, 'solvedNotes');
  useDebouncedUpdater(editingRoomAct, 'act');
  useDebouncedUpdater(editingRoomObjects, 'objects');
  useDebouncedUpdater(editingRoomPuzzles, 'puzzles');
  useDebouncedUpdater(editingRoomActions, 'actions');

  const selectRoom = (index: number) => {
    setSelectedRoomIndex(index);
    const room = game?.rooms[index];
    setEditingRoomName(room?.name || '');
    setEditingRoomNotes(room?.notes || '');
    setEditingRoomSolvedNotes(room?.solvedNotes || '');
    setEditingRoomAct(room?.act || 1);
    setEditingRoomObjects(room?.objects || []);
    setEditingRoomPuzzles(room?.puzzles || []);
    setEditingRoomActions(room?.actions || []);
    setPreviewSolved(false);
  };

  const addRoom = () => {
    if (!game) return;
    const newRoom: RoomType = { id: generateUUID(), name: `Room ${game.rooms.length + 1}`, image: null, mapImage: null, notes: '', backgroundColor: '#000000', isFullScreenImage: false, act: game.rooms[selectedRoomIndex]?.act || 1, objectRemoveIds: [], objects: [], puzzles: [], actions: [], isSolved: false, solvedImage: null, solvedNotes: '' };
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
  
  const changeRoomProperty = (property: keyof RoomType, value: any) => {
    if (!game) return;
    const newRooms = [...game.rooms];
    newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], [property]: value };
    updateGame({ ...game, rooms: newRooms });
  }

  const handleFileUpload = async (file: File, property: 'image' | 'mapImage' | 'solvedImage') => {
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
    const newPuzzle: Puzzle = { id: generateUUID(), name: 'New Puzzle', answer: '', isSolved: false, unsolvedText: '', solvedText: '', image: null, sound: null, showImageOverlay: false, lockedObjectIds: [], lockedRoomIds: [], lockedPuzzleIds: [], lockedRoomSolveIds: [], autoAddLockedObjects: false, autoSolveRooms: false };
    setEditingRoomPuzzles([...editingRoomPuzzles, newPuzzle]);
    setTimeout(() => {
        puzzlesContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }

  const handlePuzzleChange = (index: number, field: keyof Puzzle, value: string | boolean | string[] | null) => {
    const newPuzzles = [...editingRoomPuzzles];
    let processedValue = value;
    if (field === 'answer' && typeof value === 'string') {
        processedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    newPuzzles[index] = { ...newPuzzles[index], [field]: processedValue };
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

  const addAction = () => {
    const newAction: Action = { id: generateUUID(), name: 'New Action', description: 'Description...', image: null, showImageOverlay: false, isComplete: false };
    setEditingRoomActions([...editingRoomActions, newAction]);
    setTimeout(() => {
        actionsContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleActionChange = (index: number, field: keyof Action, value: string | boolean | null) => {
      const newActions = [...editingRoomActions];
      newActions[index] = { ...newActions[index], [field]: value };
      setEditingRoomActions(newActions);
  };

  const handleActionFileChange = async (index: number, file: File | null) => {
      if (!file) {
          handleActionChange(index, 'image', null);
          return;
      }
      if (game) {
          try {
              const { assetId } = await gameService.uploadAsset(game.id, file);
              handleActionChange(index, 'image', assetId);
          } catch (error) {
              console.error(`Action image upload failed:`, error);
              alert(`Failed to upload action image. Please try again.`);
          }
      }
  };

  const deleteAction = (index: number) => {
      setEditingRoomActions(editingRoomActions.filter((_, i) => i !== index));
  };

  const handleResetAndPresent = async () => {
    if (!game) return;

    const resetGame: Game = {
        ...game,
        rooms: game.rooms.map(room => ({
            ...room,
            isSolved: false,
            objects: room.objects.map(obj => ({
                ...obj,
                showInInventory: false,
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
        visitedRoomIds: game.rooms.length > 0 ? [game.rooms[0].id] : [],
    };

    updateGame(resetGame);
    
    // Also update the local editing state to match
    const newCurrentRoom = resetGame.rooms[selectedRoomIndex];
    if (newCurrentRoom) {
      setEditingRoomObjects(newCurrentRoom.objects);
      setEditingRoomPuzzles(newCurrentRoom.puzzles);
      setEditingRoomActions(newCurrentRoom.actions || []);
    }

    window.open(`/game/presenter/${id}`, '_blank', 'noopener,noreferrer');
    
    setIsResetModalOpen(false);
  };

  const handleDragStart = (index: number) => {
    setDraggedRoomIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedRoomIndex === null || draggedRoomIndex === index) {
      setDropTargetIndex(null);
      return;
    }
    setDropTargetIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedRoomIndex === null || draggedRoomIndex === index || !game) return;

    const newRooms = [...game.rooms];
    const [removed] = newRooms.splice(draggedRoomIndex, 1);
    newRooms.splice(index, 0, removed);

    const selectedRoomId = game.rooms[selectedRoomIndex].id;
    const newSelectedRoomIndex = newRooms.findIndex(r => r.id === selectedRoomId);

    updateGame({ ...game, rooms: newRooms });
    
    if (newSelectedRoomIndex !== -1) {
      setSelectedRoomIndex(newSelectedRoomIndex);
    } else {
      selectRoom(index); // Fallback
    }

    setDraggedRoomIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedRoomIndex(null);
    setDropTargetIndex(null);
  };

  const applyFormatting = (format: 'bold' | 'italic' | 'highlight', type: 'notes' | 'solvedNotes', colorCode?: 'y' | 'c' | 'm' | 'l') => {
    const textarea = type === 'notes' ? descriptionTextareaRef.current : solvedDescriptionTextareaRef.current;
    const value = type === 'notes' ? editingRoomNotes : editingRoomSolvedNotes;
    const setter = type === 'notes' ? setEditingRoomNotes : setEditingRoomSolvedNotes;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let prefix = '';
    let suffix = '';

    switch (format) {
        case 'bold':
            prefix = '**';
            suffix = '**';
            break;
        case 'italic':
            prefix = '*';
            suffix = '*';
            break;
        case 'highlight':
            if (colorCode) {
                prefix = `||${colorCode}|`;
                suffix = `||`;
            }
            break;
    }
    
    if (!prefix && format !== 'highlight') return;
    if (format === 'highlight' && (!selectedText || !colorCode)) return;

    const newText = `${prefix}${selectedText}${suffix}`;
    const updatedNotes = value.substring(0, start) + newText + value.substring(end);
    setter(updatedNotes);

    textarea.focus();
    setTimeout(() => {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = end + prefix.length;
    }, 0);
  };

  const handleGlobalColorChange = (color: string | null) => {
    if (!game) return;
    const updatedGame = { ...game, globalBackgroundColor: color };
    updateGame(updatedGame);
  };

  const handleMapDisplayModeChange = (mode: 'room-specific' | 'layered') => {
    if (!game) return;
    const updatedGame = { ...game, mapDisplayMode: mode };
    updateGame(updatedGame);
  };


  const COLORS = ['#000000', '#ffffff', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];

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

  const allGameObjects = useMemo(() => {
    if (!game) return [];
    return game.rooms.flatMap(r => r.objects.map(o => ({ ...o, roomName: r.name })));
  }, [game]);

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
  
  const visibleMapImages = game.mapDisplayMode === 'room-specific'
    ? [currentRoom.mapImage].filter(Boolean)
    : game.rooms.map(r => r.mapImage).filter(Boolean);

  const filteredObjectsForRemoval = allGameObjects.filter(obj => 
    obj.name.toLowerCase().includes(objectRemoveSearch.toLowerCase()) || 
    obj.roomName.toLowerCase().includes(objectRemoveSearch.toLowerCase())
  );

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
       {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Game Settings</h2>
                    <button onClick={() => setIsSettingsModalOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Global Background Color</h3>
                            {game.globalBackgroundColor && (
                                <button 
                                    onClick={() => handleGlobalColorChange(null)}
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
                                    onClick={() => handleGlobalColorChange(color)} 
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
                        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700/50 p-1">
                            <button
                                onClick={() => handleMapDisplayModeChange('room-specific')}
                                className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                    game.mapDisplayMode === 'room-specific'
                                    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-100 font-semibold'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                }`}
                            >
                                Room Specific
                            </button>
                            <button
                                onClick={() => handleMapDisplayModeChange('layered')}
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

                <div className="mt-8 flex justify-end">
                    <button 
                        type="button" 
                        onClick={() => setIsSettingsModalOpen(false)} 
                        className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
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
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Game Settings"
          >
            <Icon as="settings" className="w-5 h-5" />
          </button>
          <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow">
            <Icon as="present" className="w-5 h-5" />
            Present
          </button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Thumbnails */}
        <aside className="w-48 bg-white dark:bg-slate-800 p-2 overflow-y-auto shadow-lg">
            <div ref={roomsContainerRef}>
              {Object.entries(roomsByAct).sort(([a], [b]) => Number(a) - Number(b)).map(([act, rooms]) => (
                <div key={`act-${act}`}>
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 py-2">Act {act}</h3>
                  <div className="space-y-2">
                    {rooms.map((room) => {
                      const index = room.originalIndex;
                      const roomMapPreview = game.mapDisplayMode === 'room-specific'
                        ? [room.mapImage].filter(Boolean)
                        : visibleMapImages;
                      return (
                        <div 
                          key={room.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDrop(index)}
                          onDragEnd={handleDragEnd}
                          onClick={() => selectRoom(index)} 
                          className={`relative group cursor-pointer rounded-md overflow-hidden border-2 ${selectedRoomIndex === index ? 'border-brand-500' : 'border-transparent hover:border-brand-300'} ${draggedRoomIndex === index ? 'opacity-50' : ''}`}
                          >
                            {dropTargetIndex === index && draggedRoomIndex !== index && (
                              <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 z-10" />
                            )}
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 p-1">{index + 1}</span>
                              <div className="flex-1 transform scale-[0.95] origin-top-left">
                                 <Room room={room} inventoryItems={inventoryItems} visibleMapImages={roomMapPreview} className="shadow-md" globalBackgroundColor={game.globalBackgroundColor} />
                              </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Icon as="reorder" className="w-5 h-5" />
                            </div>
                        </div>
                      );
                    })}
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
              <div className="flex justify-end mb-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <span>Preview Solved State</span>
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={previewSolved}
                        onChange={(e) => setPreviewSolved(e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
              <div className="relative w-full aspect-video">
                <Room room={{...currentRoom, isSolved: previewSolved}} inventoryItems={inventoryItems} visibleMapImages={visibleMapImages} globalBackgroundColor={game.globalBackgroundColor} />
                <div className={`absolute inset-0 flex ${currentRoom.isFullScreenImage ? 'pointer-events-none' : ''}`}>
                  <div className={`h-full group relative ${currentRoom.isFullScreenImage ? 'w-full' : 'w-[70%]'}`}>
                      <label className={`w-full h-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors duration-300 ${currentRoom.isFullScreenImage ? 'pointer-events-auto' : ''}`}>
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} className="sr-only" />
                          <div className="text-white text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              <p className="font-bold text-lg">{currentRoom.image ? "Change Image" : "Upload Image"}</p>
                              <p className="text-sm">Click or drag & drop</p>
                          </div>
                      </label>
                  </div>
                   <div className={`h-full ${currentRoom.isFullScreenImage ? 'hidden' : 'w-[30%]'}`}>
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
                            <div className="flex items-center justify-between mb-2 gap-2">
                                <div className="flex items-center gap-2 flex-grow">
                                    <input 
                                        type="text" 
                                        value={puzzle.name}
                                        onChange={(e) => handlePuzzleChange(index, 'name', e.target.value)}
                                        placeholder="Puzzle Name"
                                        className="font-semibold px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm w-1/2"
                                    />
                                    <input
                                        type="text"
                                        value={puzzle.answer}
                                        onChange={(e) => handlePuzzleChange(index, 'answer', e.target.value)}
                                        placeholder="Answer (optional)"
                                        className="font-mono px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm w-1/2"
                                    />
                                </div>
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
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                                        <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Room Solves</h4>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setOpenPuzzleRoomSolvesDropdown(openPuzzleRoomSolvesDropdown === puzzle.id ? null : puzzle.id)}
                                                className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm"
                                            >
                                                <span>{`${puzzle.lockedRoomSolveIds?.length || 0} selected`}</span>
                                                <svg className={`w-4 h-4 transition-transform ${openPuzzleRoomSolvesDropdown === puzzle.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                            </button>
                                            {openPuzzleRoomSolvesDropdown === puzzle.id && (
                                                <div ref={roomSolvesDropdownRef} className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    <div className="space-y-1 p-2">
                                                        {game.rooms.map(room => (
                                                            <label key={room.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pl-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md p-1">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                                                    checked={puzzle.lockedRoomSolveIds?.includes(room.id)}
                                                                    onChange={(e) => {
                                                                        const newLockedIds = e.target.checked
                                                                            ? [...(puzzle.lockedRoomSolveIds || []), room.id]
                                                                            : (puzzle.lockedRoomSolveIds || []).filter(id => id !== room.id);
                                                                        handlePuzzleChange(index, 'lockedRoomSolveIds', newLockedIds);
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
                                </div>
                            </div>
                             <div className="mt-4 space-y-2">
                                <div>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-400 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                                            checked={puzzle.autoAddLockedObjects || false}
                                            onChange={(e) => handlePuzzleChange(index, 'autoAddLockedObjects', e.target.checked)}
                                            disabled={!puzzle.lockedObjectIds || puzzle.lockedObjectIds.length === 0}
                                        />
                                        <span className={(!puzzle.lockedObjectIds || puzzle.lockedObjectIds.length === 0) ? 'text-slate-400 dark:text-slate-500' : ''}>
                                            Automatically add its locked objects in this room to inventory upon solving.
                                        </span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-400 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                                            checked={puzzle.autoSolveRooms || false}
                                            onChange={(e) => handlePuzzleChange(index, 'autoSolveRooms', e.target.checked)}
                                            disabled={!puzzle.lockedRoomSolveIds || puzzle.lockedRoomSolveIds.length === 0}
                                        />
                                        <span className={(!puzzle.lockedRoomSolveIds || puzzle.lockedRoomSolveIds.length === 0) ? 'text-slate-400 dark:text-slate-500' : ''}>
                                            Automatically set its locked Room Solves to solved.
                                        </span>
                                    </label>
                                </div>
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
            
            <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-1 text-slate-700 dark:text-slate-300">When players ask to...</h3>
                <p className="text-xs italic text-slate-500 dark:text-slate-400 mb-3">Define host responses for things players might ask to do (e.g., "look under the rug").</p>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2" ref={actionsContainerRef}>
                    {editingRoomActions.length > 0 ? editingRoomActions.map((action, index) => (
                        <div key={action.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <input 
                                    type="text" 
                                    value={action.name}
                                    onChange={(e) => handleActionChange(index, 'name', e.target.value)}
                                    placeholder="Action Name"
                                    className="font-semibold px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm w-1/3"
                                />
                                <button onClick={() => deleteAction(index)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full flex items-center justify-center">
                                    <Icon as="trash" className="w-4 h-4" />
                                </button>
                            </div>
                            <textarea 
                                value={action.description}
                                onChange={(e) => handleActionChange(index, 'description', e.target.value)}
                                placeholder="Description / Host Response"
                                rows={3}
                                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-none"
                            />
                            <div className="mt-2 text-sm">
                                <label className="block mb-1 text-slate-600 dark:text-slate-400">Image (Full Screen Overlay)</label>
                                {action.image ? (
                                    <div className="flex items-center gap-2">
                                        <img src={`/api/assets/${action.image}`} alt="Action preview" className="w-16 h-16 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                                        <button onClick={() => handleActionFileChange(index, null)} className="text-red-500 hover:text-red-700 text-xs">Clear</button>
                                    </div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={(e) => handleActionFileChange(index, e.target.files?.[0] || null)} className="text-xs w-full" />
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No actions for this room.</p>
                    )}
                </div>
                <button onClick={addAction} className="mt-3 flex items-center gap-2 text-sm px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 rounded-md hover:bg-brand-200 dark:hover:bg-brand-900">
                    <Icon as="plus" className="w-4 h-4"/> Add Action
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
                          <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Act Number</h3>
                          <input
                            type="number"
                            value={editingRoomAct}
                            onChange={e => setEditingRoomAct(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Background Color</h3>
                          {game.globalBackgroundColor ? (
                            <div className="p-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                              A global background color is active. Change it in{' '}
                              <button onClick={() => setIsSettingsModalOpen(true)} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                                Game Settings
                              </button>.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map(color => (
                                <button key={color} onClick={() => changeRoomProperty('backgroundColor', color)} className={`w-8 h-8 rounded-full border-2 ${currentRoom.backgroundColor === color ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-300 dark:border-slate-600'}`} style={{backgroundColor: color}}/>
                                ))}
                            </div>
                          )}
                        </div>
                         <div>
                            <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Object Removal</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Visiting this room will remove the selected objects from the live inventory.</p>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpenObjectRemoveDropdown(!openObjectRemoveDropdown)}
                                    className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm"
                                >
                                    <span>{`${currentRoom.objectRemoveIds?.length || 0} object(s) selected`}</span>
                                    <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openObjectRemoveDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {openObjectRemoveDropdown && (
                                    <div ref={objectRemoveDropdownRef} className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg">
                                        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                            <input 
                                                type="text"
                                                value={objectRemoveSearch}
                                                onChange={(e) => setObjectRemoveSearch(e.target.value)}
                                                placeholder="Search objects..."
                                                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto p-2">
                                            {filteredObjectsForRemoval.length > 0 ? filteredObjectsForRemoval.map(obj => (
                                                <label key={obj.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md p-2">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                                        checked={currentRoom.objectRemoveIds?.includes(obj.id)}
                                                        onChange={(e) => {
                                                            const newLockedIds = e.target.checked
                                                                ? [...(currentRoom.objectRemoveIds || []), obj.id]
                                                                : (currentRoom.objectRemoveIds || []).filter(id => id !== obj.id);
                                                            changeRoomProperty('objectRemoveIds', newLockedIds);
                                                        }}
                                                    />
                                                    <div>
                                                        <span>{obj.name}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({obj.roomName})</span>
                                                    </div>
                                                </label>
                                            )) : (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic p-2">No objects found.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                <span>Full-Screen Image</span>
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={currentRoom.isFullScreenImage || false}
                                    onChange={(e) => changeRoomProperty('isFullScreenImage', e.target.checked)}
                                />
                                <div className="relative w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                            </label>
                        </div>
                    </div>
                </Accordion>
                <Accordion title="Room Description" defaultOpen={true}>
                    <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-t-lg bg-slate-50 dark:bg-slate-700/50 p-1">
                        <button onClick={() => applyFormatting('bold', 'notes')} title="Bold" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded font-bold">B</button>
                        <button onClick={() => applyFormatting('italic', 'notes')} title="Italic" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded italic">I</button>
                        <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                        <button onClick={() => applyFormatting('highlight', 'notes', 'y')} title="Highlight Yellow" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                            <div className="w-4 h-4 rounded-sm bg-yellow-400 border border-yellow-500"></div>
                        </button>
                        <button onClick={() => applyFormatting('highlight', 'notes', 'c')} title="Highlight Cyan" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                            <div className="w-4 h-4 rounded-sm bg-cyan-400 border border-cyan-500"></div>
                        </button>
                        <button onClick={() => applyFormatting('highlight', 'notes', 'm')} title="Highlight Pink" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                            <div className="w-4 h-4 rounded-sm bg-pink-400 border border-pink-500"></div>
                        </button>
                        <button onClick={() => applyFormatting('highlight', 'notes', 'l')} title="Highlight Lime" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                            <div className="w-4 h-4 rounded-sm bg-lime-400 border border-lime-500"></div>
                        </button>
                    </div>
                    <textarea
                        ref={descriptionTextareaRef}
                        value={editingRoomNotes}
                        onChange={e => setEditingRoomNotes(e.target.value)}
                        placeholder="Add room description here..."
                        className="w-full h-40 px-3 py-2 border border-t-0 border-slate-300 dark:border-slate-600 rounded-b-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                </Accordion>
                <Accordion title="Solved State">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Solved Image</h3>
                            {currentRoom.solvedImage ? (
                                <div className="flex items-center gap-2">
                                    <img src={`/api/assets/${currentRoom.solvedImage}`} alt="Solved state preview" className="w-24 h-24 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                                    <button onClick={() => changeRoomProperty('solvedImage', null)} className="text-red-500 hover:text-red-700 text-xs self-start">Clear</button>
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'solvedImage')} className="text-xs w-full" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Solved Description</h3>
                             <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-t-lg bg-slate-50 dark:bg-slate-700/50 p-1">
                                <button onClick={() => applyFormatting('bold', 'solvedNotes')} title="Bold" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded font-bold">B</button>
                                <button onClick={() => applyFormatting('italic', 'solvedNotes')} title="Italic" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded italic">I</button>
                                <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'y')} title="Highlight Yellow" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><div className="w-4 h-4 rounded-sm bg-yellow-400 border border-yellow-500"></div></button>
                                <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'c')} title="Highlight Cyan" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><div className="w-4 h-4 rounded-sm bg-cyan-400 border border-cyan-500"></div></button>
                                <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'm')} title="Highlight Pink" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><div className="w-4 h-4 rounded-sm bg-pink-400 border border-pink-500"></div></button>
                                <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'l')} title="Highlight Lime" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><div className="w-4 h-4 rounded-sm bg-lime-400 border border-lime-500"></div></button>
                            </div>
                            <textarea
                                ref={solvedDescriptionTextareaRef}
                                value={editingRoomSolvedNotes}
                                onChange={e => setEditingRoomSolvedNotes(e.target.value)}
                                placeholder="Add solved description (optional)..."
                                className="w-full h-40 px-3 py-2 border border-t-0 border-slate-300 dark:border-slate-600 rounded-b-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            />
                        </div>
                    </div>
                </Accordion>
                 <Accordion title="Actions">
                     <button onClick={deleteRoom} className="w-full flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900 transition text-sm">
                        <Icon as="trash" className="w-4 h-4" /> Delete Current Room
                      </button>
                 </Accordion>
            </div>
        </aside>
      </div>
    </div>
  );
};

export default Editor;