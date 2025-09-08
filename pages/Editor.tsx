import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import { API_BASE_URL } from '../services/presentationService';
import type { Game, Room as RoomType, InventoryObject, Puzzle, Action, Asset } from '../types';
import Room from '../components/Slide';
import Icon from '../components/Icon';
import Accordion from '../components/Accordion';
import { generateUUID } from '../utils/uuid';
import AudioPreviewPlayer from '../components/AudioPreviewPlayer';

type Status = 'loading' | 'success' | 'error';

const NAME_COLORS = [
    { name: 'Default', value: null, bg: 'bg-slate-400', border: 'border-slate-500' },
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
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [editingGameTitle, setEditingGameTitle] = useState('');
  const [editingRoomName, setEditingRoomName] = useState('');
  const [editingRoomAct, setEditingRoomAct] = useState(1);
  const [editingRoomNotes, setEditingRoomNotes] = useState('');
  const [editingRoomSolvedNotes, setEditingRoomSolvedNotes] = useState('');
  const [editingRoomObjectRemoveText, setEditingRoomObjectRemoveText] = useState('');
  const [editingRoomObjects, setEditingRoomObjects] = useState<InventoryObject[]>([]);
  const [editingRoomPuzzles, setEditingRoomPuzzles] = useState<Puzzle[]>([]);
  const [editingRoomActions, setEditingRoomActions] = useState<Action[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [openObjectRemoveDropdown, setOpenObjectRemoveDropdown] = useState<boolean>(false);
  const [objectRemoveSearch, setObjectRemoveSearch] = useState('');
  const [draggedRoomIndex, setDraggedRoomIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [previewSolved, setPreviewSolved] = useState(false);
  const [modalContent, setModalContent] = useState<{type: 'notes' | 'solvedNotes', content: string} | null>(null);
  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalTarget, setAssetModalTarget] = useState<'image' | 'mapImage' | 'solvedImage' | 'modal-object-image' | 'modal-object-inRoomImage' | 'modal-puzzle-image' | 'modal-action-image' | null>(null);
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [editingAssetName, setEditingAssetName] = useState<{ id: string; name: string } | null>(null);
  const [puzzleModalState, setPuzzleModalState] = useState<{ puzzle: Puzzle; index: number } | null>(null);
  const [modalPuzzleData, setModalPuzzleData] = useState<Puzzle | null>(null);
  const [openModalPuzzleObjectsDropdown, setOpenModalPuzzleObjectsDropdown] = useState(false);
  const [openModalPuzzleDiscardObjectsDropdown, setOpenModalPuzzleDiscardObjectsDropdown] = useState(false);
  const [openModalPuzzleRoomsDropdown, setOpenModalPuzzleRoomsDropdown] = useState(false);
  const [openModalPuzzlePuzzlesDropdown, setOpenModalPuzzlePuzzlesDropdown] = useState(false);
  const [openModalPuzzleRoomSolvesDropdown, setOpenModalPuzzleRoomSolvesDropdown] = useState(false);
  const [openModalPuzzleActionsDropdown, setOpenModalPuzzleActionsDropdown] = useState(false);
  const [openModalPuzzleCompletedActionsDropdown, setOpenModalPuzzleCompletedActionsDropdown] = useState(false);
  const [openModalPuzzleActsDropdown, setOpenModalPuzzleActsDropdown] = useState(false);
  const [modalPuzzleObjectsSearch, setModalPuzzleObjectsSearch] = useState('');
  const [modalPuzzleDiscardObjectsSearch, setModalPuzzleDiscardObjectsSearch] = useState('');
  const [modalPuzzlePuzzlesSearch, setModalPuzzlePuzzlesSearch] = useState('');
  const [modalPuzzleRoomsSearch, setModalPuzzleRoomsSearch] = useState('');
  const [modalPuzzleRoomSolvesSearch, setModalPuzzleRoomSolvesSearch] = useState('');
  const [modalPuzzleActionsSearch, setModalPuzzleActionsSearch] = useState('');
  const [modalPuzzleCompletedActionsSearch, setModalPuzzleCompletedActionsSearch] = useState('');
  const [modalPuzzleActsSearch, setModalPuzzleActsSearch] = useState('');
  const [actionModalState, setActionModalState] = useState<{ action: Action; index: number } | null>(null);
  const [modalActionData, setModalActionData] = useState<Action | null>(null);
  const [collapsedActs, setCollapsedActs] = useState<Record<number, boolean>>({});
  const [objectModalState, setObjectModalState] = useState<{ object: InventoryObject; index: number } | null>(null);
  const [modalObjectData, setModalObjectData] = useState<InventoryObject | null>(null);


  const objectRemoveDropdownRef = useRef<HTMLDivElement>(null);
  const modalObjectsDropdownRef = useRef<HTMLDivElement>(null);
  const modalDiscardObjectsDropdownRef = useRef<HTMLDivElement>(null);
  const modalRoomsDropdownRef = useRef<HTMLDivElement>(null);
  const modalPuzzlesDropdownRef = useRef<HTMLDivElement>(null);
  const modalRoomSolvesDropdownRef = useRef<HTMLDivElement>(null);
  const modalActionsDropdownRef = useRef<HTMLDivElement>(null);
  const modalCompletedActionsDropdownRef = useRef<HTMLDivElement>(null);
  const modalActsDropdownRef = useRef<HTMLDivElement>(null);
  const roomsContainerRef = useRef<HTMLDivElement>(null);
  const objectsContainerRef = useRef<HTMLDivElement>(null);
  const puzzlesContainerRef = useRef<HTMLDivElement>(null);
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const solvedDescriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { objectLockMap, puzzleLockMap, actionLockMap } = useMemo(() => {
    const objectLockMap = new Map<string, string[]>();
    const puzzleLockMap = new Map<string, string[]>();
    const actionLockMap = new Map<string, string[]>();

    if (!game) return { objectLockMap, puzzleLockMap, actionLockMap };

    game.rooms.forEach(room => {
      room.puzzles.forEach(puzzle => {
        const puzzleName = puzzle.name || 'Untitled Puzzle';

        (puzzle.lockedObjectIds || []).forEach(id => {
          if (!objectLockMap.has(id)) objectLockMap.set(id, []);
          objectLockMap.get(id)!.push(puzzleName);
        });
        (puzzle.lockedPuzzleIds || []).forEach(id => {
          if (!puzzleLockMap.has(id)) puzzleLockMap.set(id, []);
          puzzleLockMap.get(id)!.push(puzzleName);
        });
        (puzzle.lockedActionIds || []).forEach(id => {
          if (!actionLockMap.has(id)) actionLockMap.set(id, []);
          actionLockMap.get(id)!.push(puzzleName);
        });
      });
    });

    return { objectLockMap, puzzleLockMap, actionLockMap };
  }, [game]);

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
              setEditingRoomObjectRemoveText(currentRoom.objectRemoveText || '');
              setEditingRoomObjects(currentRoom.objects || []);
              setEditingRoomPuzzles(currentRoom.puzzles || []);
              setEditingRoomActions(currentRoom.actions || []);
          }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (objectRemoveDropdownRef.current && !objectRemoveDropdownRef.current.contains(event.target as Node)) {
            setOpenObjectRemoveDropdown(false);
        }
        if (modalObjectsDropdownRef.current && !modalObjectsDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleObjectsDropdown(false);
        }
        if (modalDiscardObjectsDropdownRef.current && !modalDiscardObjectsDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleDiscardObjectsDropdown(false);
        }
        if (modalRoomsDropdownRef.current && !modalRoomsDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleRoomsDropdown(false);
        }
        if (modalPuzzlesDropdownRef.current && !modalPuzzlesDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzlePuzzlesDropdown(false);
        }
        if (modalRoomSolvesDropdownRef.current && !modalRoomSolvesDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleRoomSolvesDropdown(false);
        }
        if (modalActionsDropdownRef.current && !modalActionsDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleActionsDropdown(false);
        }
        if (modalCompletedActionsDropdownRef.current && !modalCompletedActionsDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleCompletedActionsDropdown(false);
        }
        if (modalActsDropdownRef.current && !modalActsDropdownRef.current.contains(event.target as Node)) {
            setOpenModalPuzzleActsDropdown(false);
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
  useDebouncedUpdater(editingRoomObjectRemoveText, 'objectRemoveText');
  
  useEffect(() => {
    setModalPuzzleData(puzzleModalState ? puzzleModalState.puzzle : null);
  }, [puzzleModalState]);

  useEffect(() => {
    setModalActionData(actionModalState ? actionModalState.action : null);
  }, [actionModalState]);

  useEffect(() => {
    setModalObjectData(objectModalState ? objectModalState.object : null);
  }, [objectModalState]);

  const selectRoom = (index: number, rooms?: RoomType[]) => {
    const roomList = rooms || game?.rooms;
    if (!roomList || !roomList[index]) return;

    setSelectedRoomIndex(index);
    const room = roomList[index];
    setEditingRoomName(room.name || '');
    setEditingRoomNotes(room.notes || '');
    setEditingRoomSolvedNotes(room.solvedNotes || '');
    setEditingRoomAct(room.act || 1);
    setEditingRoomObjectRemoveText(room.objectRemoveText || '');
    setEditingRoomObjects(room.objects || []);
    setEditingRoomPuzzles(room.puzzles || []);
    setEditingRoomActions(room.actions || []);
    setPreviewSolved(false);
  };

  const addRoom = () => {
    if (!game) return;
    const latestAct = game.rooms.length > 0 ? Math.max(...game.rooms.map(r => r.act || 1)) : 1;
    const newRoom: RoomType = { id: generateUUID(), name: `Room ${game.rooms.length + 1}`, image: null, mapImage: null, notes: '', backgroundColor: '#000000', isFullScreenImage: false, act: latestAct, objectRemoveIds: [], objectRemoveText: '', objects: [], puzzles: [], actions: [], isSolved: false, solvedImage: null, solvedNotes: '', transitionType: 'none', transitionDuration: 1 };
    const newRooms = [...game.rooms, newRoom];
    updateGame({ ...game, rooms: newRooms });
    selectRoom(newRooms.length - 1, newRooms);
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
        selectRoom(newIndex, newRooms);
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
          const { assetId } = await gameService.uploadAsset(game.id, file);
          const newRooms = [...game.rooms];
          newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], [property]: assetId };
          updateGame({ ...game, rooms: newRooms });
          
          const assets = await gameService.getAssetsForGame(game.id);
          setAssetLibrary(assets);
      } catch (error) {
          console.error(`${property} upload failed:`, error);
          alert(`Failed to upload ${property}. Please try again.`);
      }
  };
  
  const openAssetLibrary = (target: 'image' | 'mapImage' | 'solvedImage' | 'modal-object-image' | 'modal-object-inRoomImage' | 'modal-puzzle-image' | 'modal-action-image') => {
      setAssetModalTarget(target);
      setIsAssetModalOpen(true);
  };

  const handleSelectAsset = (assetId: string) => {
      if (!assetModalTarget || !game) return;
  
      if (assetModalTarget === 'modal-object-image') {
          handleModalObjectChange('image', assetId);
      } else if (assetModalTarget === 'modal-object-inRoomImage') {
          handleModalObjectChange('inRoomImage', assetId);
      } else if (assetModalTarget === 'modal-puzzle-image') {
          handleModalPuzzleChange('image', assetId);
      } else if (assetModalTarget === 'modal-action-image') {
          handleModalActionChange('image', assetId);
      } else if (['image', 'mapImage', 'solvedImage'].includes(assetModalTarget)) {
          changeRoomProperty(assetModalTarget as 'image' | 'mapImage' | 'solvedImage', assetId);
      }
      
      setIsAssetModalOpen(false);
      setAssetModalTarget(null);
  };

  const handleDeleteAsset = async (assetId: string) => {
      if (!game || deletingAssetId) return;
      if (!window.confirm('Are you sure you want to delete this asset? This cannot be undone and will remove the asset from all rooms, puzzles, actions, and the soundtrack.')) return;

      setDeletingAssetId(assetId);
      try {
          const success = await gameService.deleteAsset(game.id, assetId);

          if (success) {
              setAssetLibrary(prev => prev.filter(asset => asset.id !== assetId));

              let gameWasModified = false;
              let updatedGame: Game = { ...game };

              // Remove from soundtrack
              const initialSoundtrackLength = updatedGame.soundtrack?.length || 0;
              const newSoundtrack = (updatedGame.soundtrack || []).filter(track => track.id !== assetId);
              if (newSoundtrack.length < initialSoundtrackLength) {
                  updatedGame.soundtrack = newSoundtrack;
                  gameWasModified = true;
              }

              // Remove from rooms, puzzles, objects, actions
              updatedGame.rooms = updatedGame.rooms.map(room => {
                  let roomModified = false;
                  const newRoom = { ...room };

                  if (newRoom.image === assetId) { newRoom.image = null; roomModified = true; }
                  if (newRoom.mapImage === assetId) { newRoom.mapImage = null; roomModified = true; }
                  if (newRoom.solvedImage === assetId) { newRoom.solvedImage = null; roomModified = true; }

                  const newObjects = (newRoom.objects || []).map(obj => {
                      const newObj = { ...obj };
                      let hasChanged = false;
                      if (newObj.image === assetId) {
                          newObj.image = null;
                          hasChanged = true;
                      }
                      if (newObj.inRoomImage === assetId) {
                          newObj.inRoomImage = null;
                          hasChanged = true;
                      }
                      if (hasChanged) {
                          roomModified = true;
                      }
                      return newObj;
                  });

                  const newPuzzles = newRoom.puzzles.map(puzzle => {
                      let puzzleModified = false;
                      const newPuzzle = { ...puzzle };
                      if (newPuzzle.image === assetId) { newPuzzle.image = null; puzzleModified = true; }
                      if (newPuzzle.sound === assetId) { newPuzzle.sound = null; puzzleModified = true; }
                      if (puzzleModified) roomModified = true;
                      return newPuzzle;
                  });
                  
                  const newActions = (newRoom.actions || []).map(action => {
                     let actionModified = false;
                     const newAction = { ...action };
                     if (newAction.image === assetId) { newAction.image = null; actionModified = true; }
                     if (newAction.sound === assetId) { newAction.sound = null; actionModified = true; }
                     if (actionModified) roomModified = true;
                     return newAction;
                  });

                  if (roomModified) {
                      gameWasModified = true;
                  }
                  
                  newRoom.objects = newObjects;
                  newRoom.puzzles = newPuzzles;
                  newRoom.actions = newActions;
                  return newRoom;
              });

              if (gameWasModified) {
                  updateGame(updatedGame);
                  
                  const currentRoomFromUpdatedGame = updatedGame.rooms[selectedRoomIndex];
                  if (currentRoomFromUpdatedGame) {
                      setEditingRoomObjects(currentRoomFromUpdatedGame.objects);
                      setEditingRoomPuzzles(currentRoomFromUpdatedGame.puzzles);
                      setEditingRoomActions(currentRoomFromUpdatedGame.actions || []);
                  }
              }
          } else {
              alert('Failed to delete asset.');
          }
      } catch (error) {
          console.error("Failed to delete asset:", error);
          alert('An error occurred while deleting the asset.');
      } finally {
          setDeletingAssetId(null);
      }
  };

  const handleSaveAssetName = async () => {
    if (!editingAssetName || !game) return;

    const originalAsset = assetLibrary.find(a => a.id === editingAssetName.id);
    if (!editingAssetName.name.trim() || editingAssetName.name === originalAsset?.name) {
        setEditingAssetName(null);
        return;
    }
    const newName = editingAssetName.name.trim();

    const success = await gameService.updateAssetName(game.id, editingAssetName.id, newName);
    if (success) {
        setAssetLibrary(prev => prev.map(asset => 
            asset.id === editingAssetName.id ? { ...asset, name: newName } : asset
        ));
        
        // Also update name in soundtrack if it exists there
        if (game.soundtrack?.some(t => t.id === editingAssetName.id)) {
            const newSoundtrack = game.soundtrack.map(t => 
                t.id === editingAssetName.id ? { ...t, name: newName } : t
            );
            updateGame({ ...game, soundtrack: newSoundtrack });
        }
    } else {
        alert('Failed to update asset name.');
    }
    setEditingAssetName(null);
  };

  const addObject = () => {
    const newObject: InventoryObject = { id: generateUUID(), name: '', description: '', showInInventory: false, image: null, inRoomImage: null, showImageOverlay: false, nameColor: null, inventorySlot: 1 };
    const newObjects = [...editingRoomObjects, newObject];
    setEditingRoomObjects(newObjects);
    
    const newObjIndex = newObjects.length - 1;
    setObjectModalState({ object: { ...newObject }, index: newObjIndex });
  }

  const deleteObject = (index: number) => {
    if (!game) return;
    const newObjects = editingRoomObjects.filter((_, i) => i !== index);
    setEditingRoomObjects(newObjects);

    const newRooms = [...game.rooms];
    newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], objects: newObjects };
    updateGame({ ...game, rooms: newRooms });
  }

  const addPuzzle = () => {
    const newPuzzle: Puzzle = { id: generateUUID(), name: 'New Puzzle', answer: '', isSolved: false, unsolvedText: '', solvedText: '', image: null, sound: null, showImageOverlay: false, lockedObjectIds: [], discardObjectIds: [], lockedRoomIds: [], lockedPuzzleIds: [], lockedRoomSolveIds: [], lockedActionIds: [], completedActionIds: [], autoAddLockedObjects: false, lockedActNumbers: [] };
    const newPuzzles = [...editingRoomPuzzles, newPuzzle];
    setEditingRoomPuzzles(newPuzzles);
    
    const newPuzzleIndex = newPuzzles.length - 1;
    setPuzzleModalState({ puzzle: { ...newPuzzle }, index: newPuzzleIndex });
    setModalPuzzleObjectsSearch('');
    setModalPuzzleDiscardObjectsSearch('');
    setModalPuzzlePuzzlesSearch('');
    setModalPuzzleRoomsSearch('');
    setModalPuzzleRoomSolvesSearch('');
    setModalPuzzleActionsSearch('');
    setModalPuzzleCompletedActionsSearch('');
    setModalPuzzleActsSearch('');
  };

  const deletePuzzle = (index: number) => {
    if (!game) return;
    const newPuzzles = editingRoomPuzzles.filter((_, i) => i !== index);
    setEditingRoomPuzzles(newPuzzles);

    const newRooms = [...game.rooms];
    newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], puzzles: newPuzzles };
    updateGame({ ...game, rooms: newRooms });
  };

  const handleDeletePuzzle = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    deletePuzzle(index);
  };

  const addAction = () => {
    const newAction: Action = { id: generateUUID(), name: '', description: '', image: null, sound: null, showImageOverlay: false, isComplete: false, hideCompleteButton: false };
    const newActions = [...editingRoomActions, newAction];
    setEditingRoomActions(newActions);
    
    const newActionIndex = newActions.length - 1;
    setActionModalState({ action: { ...newAction }, index: newActionIndex });
  };

  const handleModalActionChange = (field: keyof Action, value: string | boolean | null) => {
      if (!modalActionData) return;
      setModalActionData({ ...modalActionData, [field]: value });
  };

  const handleModalActionFileChange = async (field: 'image' | 'sound', file: File | null) => {
      if (!game || !modalActionData) return;
      if (!file) {
          handleModalActionChange(field, null);
          return;
      }
      try {
          const { assetId } = await gameService.uploadAsset(game.id, file);
          handleModalActionChange(field, assetId);
          const assets = await gameService.getAssetsForGame(game.id);
          setAssetLibrary(assets);
      } catch (error) {
          console.error(`Action ${field} upload failed:`, error);
          alert(`Failed to upload action ${field}. Please try again.`);
      }
  };

  const handleSaveActionFromModal = () => {
      if (!actionModalState || !modalActionData || !game) return;
      
      const newActions = [...editingRoomActions];
      newActions[actionModalState.index] = modalActionData;
      setEditingRoomActions(newActions);
      
      const newRooms = [...game.rooms];
      newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], actions: newActions };
      updateGame({ ...game, rooms: newRooms });
      
      setActionModalState(null);
  };

  const deleteAction = (index: number) => {
      if (!game) return;
      const newActions = editingRoomActions.filter((_, i) => i !== index);
      setEditingRoomActions(newActions);

      const newRooms = [...game.rooms];
      newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], actions: newActions };
      updateGame({ ...game, rooms: newRooms });
  };
  
  const handleDeleteAction = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    deleteAction(index);
  };
  
// FIX: Added helper functions to toggle selections in multi-select dropdowns for puzzle locking controls.
  const toggleSelection = (field: keyof Puzzle, id: string) => {
      if (!modalPuzzleData) return;
      const currentIds = (modalPuzzleData[field] as string[] | undefined) || [];
      const newIds = currentIds.includes(id) ? currentIds.filter(i => i !== id) : [...currentIds, id];
      handleModalPuzzleChange(field, newIds);
  };
  
  const toggleActSelection = (actNumber: number) => {
      if (!modalPuzzleData) return;
      const currentActs = modalPuzzleData.lockedActNumbers || [];
      const newActs = currentActs.includes(actNumber) ? currentActs.filter(n => n !== actNumber) : [...currentActs, actNumber];
      handleModalPuzzleChange('lockedActNumbers', newActs);
  };

  const handleModalPuzzleChange = (field: keyof Puzzle, value: string | boolean | string[] | number[] | null) => {
      if (!modalPuzzleData) return;
      let processedValue = value;
      if (field === 'answer' && typeof value === 'string') {
          processedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      setModalPuzzleData({ ...modalPuzzleData, [field]: processedValue });
  };
  
  const handleModalPuzzleFileChange = async (field: 'image' | 'sound', file: File | null) => {
    if (!game || !modalPuzzleData) return;
    if (!file) {
      handleModalPuzzleChange(field, null);
      return;
    }
    try {
        const { assetId } = await gameService.uploadAsset(game.id, file);
        handleModalPuzzleChange(field, assetId);
        const assets = await gameService.getAssetsForGame(game.id);
        setAssetLibrary(assets);
    } catch (error) {
        console.error(`Puzzle ${field} upload failed:`, error);
        alert(`Failed to upload puzzle ${field}. Please try again.`);
    }
  };

  const handleSavePuzzleFromModal = () => {
    if (!puzzleModalState || !modalPuzzleData || !game) return;
    
    const newPuzzles = [...editingRoomPuzzles];
    newPuzzles[puzzleModalState.index] = modalPuzzleData;
    setEditingRoomPuzzles(newPuzzles);
    
    const newRooms = [...game.rooms];
    newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], puzzles: newPuzzles };
    updateGame({ ...game, rooms: newRooms });
    
    setPuzzleModalState(null);
  };

  const handleModalObjectChange = (field: keyof InventoryObject, value: string | boolean | null | number) => {
    if (!modalObjectData) return;
    setModalObjectData({ ...modalObjectData, [field]: value });
  };

  const handleModalObjectFileUpload = async (file: File | null, property: 'image' | 'inRoomImage') => {
      if (!game || !modalObjectData) return;
      if (!file) {
          handleModalObjectChange(property, null);
          return;
      }
      try {
          const { assetId } = await gameService.uploadAsset(game.id, file);
          handleModalObjectChange(property, assetId);
          const assets = await gameService.getAssetsForGame(game.id);
          setAssetLibrary(assets);
      } catch (error) {
          console.error(`Object image upload failed:`, error);
          alert(`Failed to upload object image. Please try again.`);
      }
  };

  const handleSaveObjectFromModal = () => {
      if (!objectModalState || !modalObjectData || !game) return;

      const newObjects = [...editingRoomObjects];
      newObjects[objectModalState.index] = modalObjectData;
      setEditingRoomObjects(newObjects);
      
      const newRooms = [...game.rooms];
      newRooms[selectedRoomIndex] = { ...newRooms[selectedRoomIndex], objects: newObjects };
      updateGame({ ...game, rooms: newRooms });
      
      setObjectModalState(null);
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
        visitedRoomIds: game.rooms.length > 0 ? [game.rooms[0].id] : [],
    };

    updateGame(resetGame);
    
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
  
  const applyModalFormatting = (format: 'bold' | 'italic' | 'highlight', colorCode?: 'y' | 'c' | 'm' | 'l') => {
    const textarea = modalTextareaRef.current;
    if (!textarea || !modalContent) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = modalContent.content.substring(start, end);

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
    const updatedContent = modalContent.content.substring(0, start) + newText + modalContent.content.substring(end);
    setModalContent(prev => prev ? { ...prev, content: updatedContent } : null);

    textarea.focus();
    setTimeout(() => {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = end + prefix.length;
    }, 0);
  };

  const toggleActCollapse = (actNumber: number) => {
      setCollapsedActs(prev => ({
          ...prev,
          [actNumber]: !prev[actNumber]
      }));
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

  const allGameActions = useMemo(() => {
    if (!game) return [];
    return game.rooms.flatMap(r => (r.actions || []).map(a => ({ ...a, roomName: r.name })));
  }, [game]);

// FIX: Added a memoized calculation for all puzzles in the game to be used in the puzzle locking controls.
  const allGamePuzzles = useMemo(() => {
    if (!game) return [];
    return game.rooms.flatMap(r => r.puzzles.map(p => ({ ...p, roomName: r.name })));
  }, [game]);

  const allGameActs = useMemo(() => {
    if (!game) return [];
    return [...new Set(game.rooms.map(r => r.act || 1))].sort((a,b) => a - b);
  }, [game]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading game...</div>;
  }
  
  if (status === 'error') {
     return <div className="flex items-center justify-center h-screen">Error: Game not found or you do not have permission to edit it.</div>;
  }

  if (!game || !game.rooms[selectedRoomIndex]) {
    return <div className="flex items-center justify-center h-screen">This game has no rooms.</div>;
  }

  const currentRoom = game.rooms[selectedRoomIndex];
  const inventoryObjects = game.rooms
    .flatMap(r => r.objects)
    .filter(t => t.showInInventory);
  
  const visibleMapImages = game.mapDisplayMode === 'room-specific'
    ? [currentRoom.mapImage].filter(Boolean)
    : game.rooms.map(r => r.mapImage).filter(Boolean);

  const filteredObjectsForRemoval = allGameObjects.filter(obj => 
    obj.name.toLowerCase().includes(objectRemoveSearch.toLowerCase()) || 
    obj.roomName.toLowerCase().includes(objectRemoveSearch.toLowerCase())
  );
  
  const hasSolvedState = currentRoom.solvedImage || (currentRoom.solvedNotes && currentRoom.solvedNotes.trim() !== '');

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
      {modalContent !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
                    {modalContent.type === 'notes' ? 'Edit Room Description' : 'Edit Solved Description'}
                </h2>
                <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-t-lg bg-slate-50 dark:bg-slate-700/50 p-1">
                    <button onClick={() => applyModalFormatting('bold')} title="Bold" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded font-bold">B</button>
                    <button onClick={() => applyModalFormatting('italic')} title="Italic" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded italic">I</button>
                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    <button onClick={() => applyModalFormatting('highlight', 'y')} title="Highlight Yellow" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                        <div className="w-4 h-4 rounded-sm bg-yellow-400 border border-yellow-500"></div>
                    </button>
                    <button onClick={() => applyModalFormatting('highlight', 'c')} title="Highlight Cyan" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                        <div className="w-4 h-4 rounded-sm bg-cyan-400 border border-cyan-500"></div>
                    </button>
                    <button onClick={() => applyModalFormatting('highlight', 'm')} title="Highlight Pink" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                        <div className="w-4 h-4 rounded-sm bg-pink-400 border border-pink-500"></div>
                    </button>
                    <button onClick={() => applyModalFormatting('highlight', 'l')} title="Highlight Lime" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                        <div className="w-4 h-4 rounded-sm bg-lime-400 border border-lime-500"></div>
                    </button>
                </div>
                <textarea
                    ref={modalTextareaRef}
                    value={modalContent.content}
                    onChange={e => setModalContent(prev => prev ? { ...prev, content: e.target.value } : null)}
                    className="w-full flex-grow px-3 py-2 border border-t-0 border-slate-300 dark:border-slate-600 rounded-b-lg bg-slate-50 dark:bg-slate-700 focus:outline-none resize-none"
                    autoFocus
                />
                <div className="mt-4 flex justify-end gap-4">
                    <button onClick={() => setModalContent(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button 
                        onClick={() => {
                            if (!modalContent) return;
                            if (modalContent.type === 'notes') {
                                setEditingRoomNotes(modalContent.content);
                            } else {
                                setEditingRoomSolvedNotes(modalContent.content);
                            }
                            setModalContent(null);
                        }} 
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
      )}
      {isAssetModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                           Image Library
                        </h2>
                        <button onClick={() => setIsAssetModalOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Icon as="close" className="w-5 h-5" />
                        </button>
                    </div>
                    {(() => {
                        const filteredAssets = assetLibrary.filter(asset => asset.mime_type.startsWith('image/'));

                        if (filteredAssets.length > 0) {
                            return (
                                <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {filteredAssets.map(asset => (
                                        <div key={asset.id} className="aspect-square group relative rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700" onClick={() => handleSelectAsset(asset.id)}>
                                            <img src={`${API_BASE_URL}/assets/${asset.id}`} alt={asset.name} className="w-full h-full object-cover"/>
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
                                <p>No image assets uploaded for this game yet.</p>
                            </div>
                        )
                    })()}
                </div>
            </div>
        )}
      {isAssetManagerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Asset Manager</h2>
                    <button onClick={() => setIsAssetManagerOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                {assetLibrary.length > 0 ? (
                    <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {assetLibrary.map(asset => (
                            <div key={asset.id} className="group relative rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex flex-col">
                                <div className="aspect-square w-full relative overflow-hidden">
                                    {asset.mime_type.startsWith('image/') ? (
                                        <img src={`${API_BASE_URL}/assets/${asset.id}`} alt={asset.name} className="w-full h-full object-cover"/>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-2">
                                            <Icon as="audio" className="w-12 h-12 mb-2"/>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                                        <button
                                            onClick={() => handleDeleteAsset(asset.id)}
                                            disabled={deletingAssetId === asset.id}
                                            className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                            aria-label="Delete asset"
                                        >
                                            {deletingAssetId === asset.id ? 
                                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                              : <Icon as="trash" className="w-5 h-5" />
                                            }
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 text-center">
                                    {editingAssetName?.id === asset.id ? (
                                        <input
                                            type="text"
                                            value={editingAssetName.name}
                                            onChange={(e) => setEditingAssetName({ ...editingAssetName, name: e.target.value })}
                                            onBlur={handleSaveAssetName}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveAssetName(); } if (e.key === 'Escape') { setEditingAssetName(null); } }}
                                            className="w-full text-xs px-1 py-0.5 border border-brand-500 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                        />
                                    ) : (
                                        <p
                                            onClick={() => setEditingAssetName({ id: asset.id, name: asset.name })}
                                            className="text-xs text-slate-600 dark:text-slate-400 break-all cursor-pointer hover:underline"
                                            title="Click to edit name"
                                        >
                                            {asset.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <p>No assets uploaded for this game yet.</p>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={() => setIsAssetManagerOpen(false)}
                        className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}
      {objectModalState && modalObjectData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Edit Object</h2>
                    <button onClick={() => setObjectModalState(null)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-grow space-y-4 overflow-y-auto pr-2 -mr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Object Name</label>
                        <input
                            type="text"
                            value={modalObjectData.name}
                            onChange={(e) => handleModalObjectChange('name', e.target.value)}
                            placeholder="e.g., A small, tarnished brass key"
                            className="w-full font-semibold px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name Color</label>
                        <div className="flex flex-wrap gap-2">
                            {NAME_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => handleModalObjectChange('nameColor', color.value)}
                                    className={`w-8 h-8 rounded-full border-2 ${modalObjectData.nameColor === color.value ? 'ring-2 ring-brand-500 border-white dark:border-slate-900' : `hover:border-slate-400 dark:hover:border-slate-500 ${color.border}`}`}
                                    title={color.name}
                                >
                                    <div className={`w-full h-full rounded-full ${color.bg}`}></div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            value={modalObjectData.description}
                            onChange={(e) => handleModalObjectChange('description', e.target.value)}
                            placeholder="e.g., A description of the object for the presenter."
                            rows={5}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                        />
                    </div>
                    {game.inventoryLayout === 'dual' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Inventory</label>
                            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700/50 p-1 max-w-xs">
                                <button
                                    onClick={() => handleModalObjectChange('inventorySlot', 1)}
                                    className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                        (modalObjectData.inventorySlot === 1 || !modalObjectData.inventorySlot)
                                        ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-100 font-semibold'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                    }`}
                                >
                                    {game.inventory1Title || 'Inventory 1'}
                                </button>
                                <button
                                    onClick={() => handleModalObjectChange('inventorySlot', 2)}
                                    className={`flex-1 text-center text-sm px-3 py-1.5 rounded-md transition-colors ${
                                        modalObjectData.inventorySlot === 2
                                        ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-100 font-semibold'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                                    }`}
                                >
                                    {game.inventory2Title || 'Inventory 2'}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Close-up Image (Optional)</label>
                          <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                            {modalObjectData.image && (
                              <img src={`${API_BASE_URL}/assets/${modalObjectData.image}`} alt={modalObjectData.name} className="w-full h-full object-cover rounded-md" />
                            )}
                            <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleModalObjectFileUpload(e.target.files[0], 'image')} className="sr-only" />
                              {!modalObjectData.image && (
                                <>
                                  <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                    <Icon as="gallery" className="w-10 h-10 mx-auto" />
                                    <p className="text-xs mt-1">Add Image</p>
                                  </div>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="pointer-events-none text-white text-center">
                                      <p className="font-bold text-xs">Upload New</p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-object-image'); }}
                                      className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center"
                                    >
                                      <Icon as="gallery" className="w-3.5 h-3.5" />
                                      From Library
                                    </button>
                                  </div>
                                </>
                              )}
                            </label>
                            {modalObjectData.image && (
                              <div className="absolute inset-0 bg-black/60 p-1 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-object-image'); }}
                                  className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                  title="Select from library"
                                >
                                  <Icon as="gallery" className="w-3.5 h-3.5" />
                                  Change
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleModalObjectChange('image', null); }}
                                  className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                  title="Clear Image"
                                >
                                  <Icon as="trash" className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">In Room Image (Optional)</label>
                          <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                            {modalObjectData.inRoomImage && (
                              <img src={`${API_BASE_URL}/assets/${modalObjectData.inRoomImage}`} alt={modalObjectData.name} className="w-full h-full object-cover rounded-md" />
                            )}
                            <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleModalObjectFileUpload(e.target.files[0], 'inRoomImage')} className="sr-only" />
                              {!modalObjectData.inRoomImage && (
                                <>
                                  <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                    <Icon as="gallery" className="w-10 h-10 mx-auto" />
                                    <p className="text-xs mt-1">Add Image</p>
                                  </div>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="pointer-events-none text-white text-center">
                                      <p className="font-bold text-xs">Upload New</p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-object-inRoomImage'); }}
                                      className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center"
                                    >
                                      <Icon as="gallery" className="w-3.5 h-3.5" />
                                      From Library
                                    </button>
                                  </div>
                                </>
                              )}
                            </label>
                            {modalObjectData.inRoomImage && (
                              <div className="absolute inset-0 bg-black/60 p-1 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-object-inRoomImage'); }}
                                  className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                  title="Select from library"
                                >
                                  <Icon as="gallery" className="w-3.5 h-3.5" />
                                  Change
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleModalObjectChange('inRoomImage', null); }}
                                  className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                  title="Clear Image"
                                >
                                  <Icon as="trash" className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                    <button onClick={() => setObjectModalState(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleSaveObjectFromModal} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Save & Close</button>
                </div>
            </div>
        </div>
      )}
      {puzzleModalState && modalPuzzleData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Edit Puzzle</h2>
                    <button onClick={() => setPuzzleModalState(null)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-6 overflow-y-auto pr-2 -mr-2">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Puzzle Name</label>
                            <input
                                type="text"
                                value={modalPuzzleData.name}
                                onChange={(e) => handleModalPuzzleChange('name', e.target.value)}
                                className="w-full font-semibold px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Answer (Optional)</label>
                            <input
                                type="text"
                                value={modalPuzzleData.answer}
                                onChange={(e) => handleModalPuzzleChange('answer', e.target.value)}
                                placeholder="Alphanumeric, no spaces, lowercase"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm font-mono tracking-wider"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">If blank, puzzle can be marked "Complete" without an answer.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unsolved Description</label>
                            <textarea
                                value={modalPuzzleData.unsolvedText}
                                onChange={(e) => handleModalPuzzleChange('unsolvedText', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solved Description</label>
                            <textarea
                                value={modalPuzzleData.solvedText}
                                onChange={(e) => handleModalPuzzleChange('solvedText', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                            />
                        </div>
                        <div className="flex gap-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image (Optional)</label>
                              <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                                {modalPuzzleData.image && (
                                  <img src={`${API_BASE_URL}/assets/${modalPuzzleData.image}`} alt={modalPuzzleData.name} className="w-full h-full object-cover rounded-md" />
                                )}
                                <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleModalPuzzleFileChange('image', e.target.files[0])} className="sr-only" />
                                  {!modalPuzzleData.image && (
                                    <>
                                      <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                        <Icon as="gallery" className="w-10 h-10 mx-auto" />
                                        <p className="text-xs mt-1">Add Image</p>
                                      </div>
                                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="pointer-events-none text-white text-center"><p className="font-bold text-xs">Upload New</p></div>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-puzzle-image'); }}
                                          className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center">
                                          <Icon as="gallery" className="w-3.5 h-3.5" /> From Library
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </label>
                                {modalPuzzleData.image && (
                                  <div className="absolute inset-0 bg-black/60 p-1 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-puzzle-image'); }}
                                      className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors" title="Select from library">
                                      <Icon as="gallery" className="w-3.5 h-3.5" />Change
                                    </button>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleModalPuzzleChange('image', null); }}
                                      className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" title="Clear Image">
                                      <Icon as="trash" className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sound (Optional)</label>
                                <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center p-2 text-center">
                                    {modalPuzzleData.sound ? (
                                        <>
                                            <Icon as="audio" className="w-10 h-10 text-slate-500 dark:text-slate-400" />
                                            <p className="text-xs mt-2 text-slate-600 dark:text-slate-300">
                                                {assetLibrary.find(a => a.id === modalPuzzleData.sound)?.name || 'Sound selected'}
                                            </p>
                                             <button
                                                onClick={() => handleModalPuzzleChange('sound', null)}
                                                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title="Clear Sound"
                                            >
                                                <Icon as="trash" className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleModalPuzzleFileChange('sound', e.target.files[0])} className="sr-only" />
                                            <Icon as="audio" className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
                                            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Add Sound</p>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="space-y-4">
                        <Accordion title="Locking: Control what this puzzle makes available">
                           <div className="space-y-4 text-sm">
                                {/* Implementation of locking controls */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unlock Objects</label>
                                    {/* A multi-select dropdown would go here. Simplified for now. */}
                                </div>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={modalPuzzleData.autoAddLockedObjects} onChange={e => handleModalPuzzleChange('autoAddLockedObjects', e.target.checked)} className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"/>
                                    <span>Automatically add unlocked objects to inventory.</span>
                                </label>
                           </div>
                        </Accordion>
                        <Accordion title="Unlocking: Control what is required to see this puzzle">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                This puzzle is made visible by solving other puzzles.
                                To configure which puzzles unlock this one, go to those puzzles and add this one to their "Unlocks Puzzles" list.
                            </div>
                        </Accordion>
                    </div>
                </div>
                <div className="flex-shrink-0 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                    <button onClick={() => setPuzzleModalState(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleSavePuzzleFromModal} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Save & Close</button>
                </div>
            </div>
        </div>
      )}
      {actionModalState && modalActionData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Edit Action</h2>
                    <button onClick={() => setActionModalState(null)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-grow space-y-4 overflow-y-auto pr-2 -mr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Action Name</label>
                        <input
                            type="text"
                            value={modalActionData.name}
                            onChange={(e) => handleModalActionChange('name', e.target.value)}
                            className="w-full font-semibold px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            value={modalActionData.description}
                            onChange={(e) => handleModalActionChange('description', e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                        />
                    </div>
                     <div className="flex gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image (Optional)</label>
                            <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                                {modalActionData.image && (
                                    <img src={`${API_BASE_URL}/assets/${modalActionData.image}`} alt={modalActionData.name} className="w-full h-full object-cover rounded-md" />
                                )}
                                <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleModalActionFileChange('image', e.target.files[0])} className="sr-only" />
                                    {!modalActionData.image && (
                                    <>
                                        <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                            <Icon as="gallery" className="w-10 h-10 mx-auto" />
                                            <p className="text-xs mt-1">Add Image</p>
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="pointer-events-none text-white text-center"><p className="font-bold text-xs">Upload New</p></div>
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-action-image'); }}
                                                className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center">
                                                <Icon as="gallery" className="w-3.5 h-3.5" /> From Library
                                            </button>
                                        </div>
                                    </>
                                    )}
                                </label>
                                {modalActionData.image && (
                                    <div className="absolute inset-0 bg-black/60 p-1 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-action-image'); }}
                                            className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors" title="Select from library">
                                            <Icon as="gallery" className="w-3.5 h-3.5" />Change
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleModalActionChange('image', null); }}
                                            className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" title="Clear Image">
                                            <Icon as="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sound (Optional)</label>
                            <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center p-2 text-center">
                                {modalActionData.sound ? (
                                    <>
                                        <Icon as="audio" className="w-10 h-10 text-slate-500 dark:text-slate-400" />
                                        <p className="text-xs mt-2 text-slate-600 dark:text-slate-300">
                                            {assetLibrary.find(a => a.id === modalActionData.sound)?.name || 'Sound selected'}
                                        </p>
                                         <button
                                            onClick={() => handleModalActionChange('sound', null)}
                                            className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            title="Clear Sound"
                                        >
                                            <Icon as="trash" className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <label className="cursor-pointer">
                                        <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleModalActionFileChange('sound', e.target.files[0])} className="sr-only" />
                                        <Icon as="audio" className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
                                        <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Add Sound</p>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg max-w-md">
                            <input
                                type="checkbox"
                                className="rounded border-slate-400 text-brand-600 focus:ring-brand-500 w-4 h-4"
                                checked={modalActionData.hideCompleteButton || false}
                                onChange={e => handleModalActionChange('hideCompleteButton', e.target.checked)}
                            />
                            <span>Hide the "Complete/Re-open" button for this action in the Presenter View.</span>
                        </label>
                    </div>
                </div>
                <div className="flex-shrink-0 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                    <button onClick={() => setActionModalState(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleSaveActionFromModal} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Save & Close</button>
                </div>
            </div>
        </div>
      )}
       <header className="bg-white dark:bg-slate-800 shadow-md p-2 flex justify-between items-center z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                  <Icon as="prev" className="w-5 h-5"/>
                  Dashboard
              </Link>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
              <input 
                  type="text" 
                  value={editingGameTitle}
                  onChange={e => setEditingGameTitle(e.target.value)}
                  className="text-lg font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md px-2 py-1 -ml-2"
              />
          </div>
          <div className="flex items-center gap-2">
                <Link to={`/settings/${id}`} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    <Icon as="settings" className="w-5 h-5"/>
                    <span className="hidden lg:inline">Settings</span>
                </Link>
                <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow"
                >
                    <Icon as="present" className="w-5 h-5" />
                    <span className="hidden lg:inline">Present</span>
                </button>
          </div>
       </header>
       <main className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Left Column (Room List) */}
          <div className="col-span-3 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Rooms</h2>
                  <button onClick={addRoom} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                      <Icon as="plus" className="w-5 h-5"/>
                  </button>
              </div>
              <div ref={roomsContainerRef} className="flex-grow overflow-y-auto">
                  {Object.entries(roomsByAct).map(([actNumber, rooms]) => (
                      <div key={actNumber}>
                          {allGameActs.length > 1 && (
                              <button onClick={() => toggleActCollapse(Number(actNumber))} className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                  <span className="font-bold text-sm text-slate-600 dark:text-slate-400">Act {actNumber}</span>
                                  <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${collapsedActs[Number(actNumber)] ? 'rotate-180' : ''}`} />
                              </button>
                          )}
                          {!collapsedActs[Number(actNumber)] && rooms.map(room => {
                              const index = room.originalIndex;
                              const isSelected = selectedRoomIndex === index;
                              const isBeingDragged = draggedRoomIndex === index;
                              const isDropTarget = dropTargetIndex === index;

                              return (
                                  <div
                                      key={room.id}
                                      draggable
                                      onDragStart={() => handleDragStart(index)}
                                      onDragOver={(e) => handleDragOver(e, index)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={() => handleDrop(index)}
                                      onDragEnd={handleDragEnd}
                                      className={`
                                        flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700
                                        ${isSelected ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                                        ${isBeingDragged ? 'opacity-30' : ''}
                                        transition-all duration-200 cursor-pointer
                                      `}
                                      onClick={() => selectRoom(index)}
                                  >
                                      <Icon as="reorder" className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                          <p className={`font-semibold truncate ${isSelected ? 'text-brand-700 dark:text-brand-300' : ''}`}>{room.name}</p>
                                      </div>
                                      {isDropTarget && (
                                          <div className="absolute left-0 right-0 h-full border-2 border-brand-500 rounded-lg pointer-events-none"></div>
                                      )}
                                      {isDropTarget && dropTargetIndex !== null && draggedRoomIndex !== null && dropTargetIndex > draggedRoomIndex && (
                                          <div className="absolute bottom-0 left-2 right-2 h-1 bg-brand-500 rounded-full pointer-events-none"></div>
                                      )}
                                      {isDropTarget && dropTargetIndex !== null && draggedRoomIndex !== null && dropTargetIndex < draggedRoomIndex && (
                                          <div className="absolute top-0 left-2 right-2 h-1 bg-brand-500 rounded-full pointer-events-none"></div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  ))}
              </div>
          </div>
          {/* Middle Column (Room Editor) */}
          <div className="col-span-5 flex flex-col overflow-y-auto">
             { /* Room Editor Content */ }
          </div>
          {/* Right Column (Preview) */}
          <div className="col-span-4 bg-black flex items-center justify-center p-4">
              <div className="w-full h-full">
                <Room 
                    room={{...currentRoom, isSolved: previewSolved}} 
                    inventoryObjects={inventoryObjects} 
                    visibleMapImages={visibleMapImages}
                    globalBackgroundColor={game.globalBackgroundColor}
                    inventoryLayout={game.inventoryLayout}
                    inventory1Title={game.inventory1Title}
                    inventory2Title={game.inventory2Title}
                />
              </div>
          </div>
       </main>
    </div>
  );
};

export default Editor;
