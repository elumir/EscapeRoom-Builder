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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [openObjectRemoveDropdown, setOpenObjectRemoveDropdown] = useState<boolean>(false);
  const [objectRemoveSearch, setObjectRemoveSearch] = useState('');
  const [draggedRoomIndex, setDraggedRoomIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [previewSolved, setPreviewSolved] = useState(false);
  const [modalContent, setModalContent] = useState<{type: 'notes' | 'solvedNotes', content: string} | null>(null);
  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalTarget, setAssetModalTarget] = useState<'image' | 'mapImage' | 'solvedImage' | 'modal-object' | null>(null);
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
  const [copySuccess, setCopySuccess] = useState(false);


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
    const newRoom: RoomType = { id: generateUUID(), name: `Room ${game.rooms.length + 1}`, image: null, mapImage: null, notes: '', backgroundColor: '#000000', isFullScreenImage: false, act: latestAct, objectRemoveIds: [], objectRemoveText: '', objects: [], puzzles: [], actions: [], isSolved: false, solvedImage: null, solvedNotes: '' };
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
  
  const openAssetLibrary = (target: 'image' | 'mapImage' | 'solvedImage' | 'modal-object') => {
      setAssetModalTarget(target);
      setIsAssetModalOpen(true);
  };

  const handleSelectAsset = (assetId: string) => {
      if (!assetModalTarget) return;

      if (typeof assetModalTarget === 'string' && assetModalTarget !== 'modal-object') {
          changeRoomProperty(assetModalTarget, assetId);
      } else if (assetModalTarget === 'modal-object') {
          handleModalObjectChange('image', assetId);
      }
      
      setIsAssetModalOpen(false);
      setAssetModalTarget(null);
  };

  const handleDeleteAsset = async (assetId: string) => {
      if (!game || deletingAssetId) return;
      if (!window.confirm('Are you sure you want to delete this asset? This cannot be undone and will remove the asset from all rooms, puzzles, and actions.')) return;

      setDeletingAssetId(assetId);
      try {
          const success = await gameService.deleteAsset(game.id, assetId);

          if (success) {
              setAssetLibrary(prev => prev.filter(asset => asset.id !== assetId));

              let gameWasModified = false;
              const updatedGame: Game = {
                  ...game,
                  rooms: game.rooms.map(room => {
                      let roomModified = false;
                      const newRoom = { ...room };

                      if (newRoom.image === assetId) { newRoom.image = null; roomModified = true; }
                      if (newRoom.mapImage === assetId) { newRoom.mapImage = null; roomModified = true; }
                      if (newRoom.solvedImage === assetId) { newRoom.solvedImage = null; roomModified = true; }

                      const newObjects = (newRoom.objects || []).map(obj => {
                          if (obj.image === assetId) {
                              roomModified = true;
                              return { ...obj, image: null };
                          }
                          return obj;
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
                  })
              };

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

    const success = await gameService.updateAssetName(game.id, editingAssetName.id, editingAssetName.name.trim());
    if (success) {
        setAssetLibrary(prev => prev.map(asset => 
            asset.id === editingAssetName.id ? { ...asset, name: editingAssetName.name.trim() } : asset
        ));
    } else {
        alert('Failed to update asset name.');
    }
    setEditingAssetName(null);
  };

  const addObject = () => {
    const newObject: InventoryObject = { id: generateUUID(), name: '', description: '', showInInventory: false, image: null, showImageOverlay: false};
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

  const handleModalObjectChange = (field: keyof InventoryObject, value: string | boolean | null) => {
    if (!modalObjectData) return;
    setModalObjectData({ ...modalObjectData, [field]: value });
  };

  const handleModalObjectFileUpload = async (file: File | null) => {
      if (!game || !modalObjectData) return;
      if (!file) {
          handleModalObjectChange('image', null);
          return;
      }
      try {
          const { assetId } = await gameService.uploadAsset(game.id, file);
          handleModalObjectChange('image', assetId);
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

  const handleHideAvailableObjectsChange = (hide: boolean) => {
    if (!game) return;
    const updatedGame = { ...game, hideAvailableObjects: hide };
    updateGame(updatedGame);
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
       {isSettingsModalOpen && game && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Game Settings</h2>
                    <button onClick={() => setIsSettingsModalOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* SHARING SECTION */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Sharing</h3>
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
                                : 'Anyone with the link can present this game. They cannot edit it.'
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
                    <div>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Presenter View Options</h3>
                        <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                            <input
                                type="checkbox"
                                className="rounded border-slate-400 text-brand-600 focus:ring-brand-500 w-4 h-4"
                                checked={game.hideAvailableObjects || false}
                                onChange={e => handleHideAvailableObjectsChange(e.target.checked)}
                            />
                            <span>Hide Available Objects in presenter view because all objects are automatically picked up.</span>
                        </label>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-red-500/30">
                    <h3 className="font-semibold text-red-500 dark:text-red-400 mb-2">Danger Zone</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        This action cannot be undone. This will permanently delete the game and all its assets.
                    </p>
                    <button
                        onClick={handleDeleteGame}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300 shadow"
                    >
                        <Icon as="trash" className="w-5 h-5" />
                        Delete this Game
                    </button>
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
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Asset Library</h2>
                        <button onClick={() => setIsAssetModalOpen(false)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Icon as="close" className="w-5 h-5" />
                        </button>
                    </div>
                    {assetLibrary.length > 0 ? (
                        <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {assetLibrary.filter(asset => asset.mime_type.startsWith('image/')).map(asset => (
                                <div key={asset.id} className="aspect-square group relative rounded-md overflow-hidden" onClick={() => handleSelectAsset(asset.id)}>
                                    <img src={`${API_BASE_URL}/assets/${asset.id}`} alt="Game asset" className="w-full h-full object-cover"/>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer">
                                        <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">Select</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <p>No image assets uploaded for this game yet.</p>
                        </div>
                    )}
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
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            value={modalObjectData.description}
                            onChange={(e) => handleModalObjectChange('description', e.target.value)}
                            placeholder="e.g., A description of the object for the presenter."
                            rows={5}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                        />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image (Optional)</label>
                      <div className="relative group w-32 h-32 bg-slate-100 dark:bg-slate-700/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                        {modalObjectData.image && (
                          <img src={`${API_BASE_URL}/assets/${modalObjectData.image}`} alt={modalObjectData.name} className="w-full h-full object-cover rounded-md" />
                        )}
                        <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleModalObjectFileUpload(e.target.files[0])} className="sr-only" />
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
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-object'); }}
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
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('modal-object'); }}
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Edit Puzzle: {modalPuzzleData.name}</h2>
                    <button onClick={() => setPuzzleModalState(null)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Puzzle Name</label>
                            <input 
                                type="text" 
                                value={modalPuzzleData.name}
                                onChange={(e) => handleModalPuzzleChange('name', e.target.value)}
                                placeholder="Puzzle Name"
                                className="w-full font-semibold px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Answer (optional)</label>
                            <input
                                type="text"
                                value={modalPuzzleData.answer}
                                onChange={(e) => handleModalPuzzleChange('answer', e.target.value)}
                                placeholder="Answer (optional)"
                                className="w-full font-mono px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unsolved Text</label>
                            <textarea 
                                value={modalPuzzleData.unsolvedText}
                                onChange={(e) => handleModalPuzzleChange('unsolvedText', e.target.value)}
                                placeholder="Unsolved Text"
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solved Text</label>
                            <textarea 
                                value={modalPuzzleData.solvedText}
                                onChange={(e) => handleModalPuzzleChange('solvedText', e.target.value)}
                                placeholder="Solved Text"
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image</label>
                            {modalPuzzleData.image ? (
                                <div className="flex items-center gap-2">
                                    <img src={`${API_BASE_URL}/assets/${modalPuzzleData.image}`} alt="Puzzle preview" className="w-24 h-24 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                                    <button onClick={() => handleModalPuzzleFileChange('image', null)} className="text-red-500 hover:text-red-700 text-xs self-end p-1">Clear</button>
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={(e) => handleModalPuzzleFileChange('image', e.target.files?.[0] || null)} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sound</label>
                            {modalPuzzleData.sound ? (
                                <div className="space-y-2">
                                    <AudioPreviewPlayer assetId={modalPuzzleData.sound} />
                                    <button onClick={() => handleModalPuzzleFileChange('sound', null)} className="text-red-500 hover:text-red-700 text-xs px-1">Clear Sound</button>
                                </div>
                            ) : (
                                <input type="file" accept="audio/*" onChange={(e) => handleModalPuzzleFileChange('sound', e.target.files?.[0] || null)} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                            )}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            {/* Column 1: Locked elements */}
                            <div className="space-y-4">
                                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Locked elements</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">Elements that are locked until puzzle is solved.</p>

                                {/* Locked Objects */}
                                <div className="relative" ref={modalObjectsDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Objects</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleObjectsDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.lockedObjectIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleObjectsDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleObjectsDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input 
                                                    type="text"
                                                    value={modalPuzzleObjectsSearch}
                                                    onChange={(e) => setModalPuzzleObjectsSearch(e.target.value)}
                                                    placeholder="Search objects..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto">
                                                {game.rooms.map(room => {
                                                    const filteredObjects = room.objects.filter(obj => 
                                                        obj.name.toLowerCase().includes(modalPuzzleObjectsSearch.toLowerCase())
                                                    );
                                                    if (filteredObjects.length === 0) return null;
                                                    return (
                                                        <div key={room.id} className="p-2">
                                                            <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                            {filteredObjects.map(obj => (
                                                              <label key={obj.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={modalPuzzleData.lockedObjectIds?.includes(obj.id)} 
                                                                    onChange={e => {
                                                                        setModalPuzzleData(prevData => {
                                                                            if (!prevData) return null;
                                                                            const currentIds = prevData.lockedObjectIds || [];
                                                                            const newLockedIds = e.target.checked
                                                                                ? [...currentIds, obj.id]
                                                                                : currentIds.filter(id => id !== obj.id);
                                                                            
                                                                            const newState: Puzzle = {
                                                                                ...prevData,
                                                                                lockedObjectIds: newLockedIds,
                                                                            };
                                                                    
                                                                            if (e.target.checked && newLockedIds.length > 0) {
                                                                                newState.autoAddLockedObjects = true;
                                                                            }
                                                                    
                                                                            return newState;
                                                                        });
                                                                    }} 
                                                                />
                                                                {obj.name}
                                                              </label>
                                                            ))}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Locked Actions */}
                                <div className="relative" ref={modalActionsDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Actions</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleActionsDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.lockedActionIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleActionsDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleActionsDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input
                                                    type="text"
                                                    value={modalPuzzleActionsSearch}
                                                    onChange={(e) => setModalPuzzleActionsSearch(e.target.value)}
                                                    placeholder="Search actions..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto">
                                              {game.rooms.map(room => {
                                                const filteredActions = (room.actions || []).filter(a =>
                                                    (a.name || 'Untitled Action').toLowerCase().includes(modalPuzzleActionsSearch.toLowerCase())
                                                );
                                                if (filteredActions.length === 0) return null;
                                                return (
                                                    <div key={room.id} className="p-2">
                                                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                        {filteredActions.map(action => (
                                                          <label key={action.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                            <input
                                                              type="checkbox"
                                                              checked={modalPuzzleData.lockedActionIds?.includes(action.id)}
                                                              onChange={e => {
                                                                  setModalPuzzleData(prevData => {
                                                                      if (!prevData) return null;
                                                                      const currentIds = prevData.lockedActionIds || [];
                                                                      const newIds = e.target.checked
                                                                          ? [...currentIds, action.id]
                                                                          : currentIds.filter(id => id !== action.id);
                                                                      return { ...prevData, lockedActionIds: newIds };
                                                                  });
                                                              }}
                                                            />
                                                            {action.name || <span className="italic">Untitled Action</span>}
                                                          </label>
                                                        ))}
                                                    </div>
                                                )
                                              })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Locked Puzzles */}
                                <div className="relative" ref={modalPuzzlesDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Puzzles</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzlePuzzlesDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.lockedPuzzleIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzlePuzzlesDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzlePuzzlesDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input 
                                                    type="text"
                                                    value={modalPuzzlePuzzlesSearch}
                                                    onChange={(e) => setModalPuzzlePuzzlesSearch(e.target.value)}
                                                    placeholder="Search puzzles..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto">
                                              {game.rooms.map(room => {
                                                const filteredPuzzles = room.puzzles.filter(p => p.id !== modalPuzzleData.id && p.name.toLowerCase().includes(modalPuzzlePuzzlesSearch.toLowerCase()));
                                                if (filteredPuzzles.length === 0) return null;
                                                return (
                                                    <div key={room.id} className="p-2">
                                                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                        {filteredPuzzles.map(p => (
                                                          <label key={p.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                            <input type="checkbox" checked={modalPuzzleData.lockedPuzzleIds?.includes(p.id)} onChange={e => {
                                                                setModalPuzzleData(prevData => {
                                                                    if (!prevData) return null;
                                                                    const currentIds = prevData.lockedPuzzleIds || [];
                                                                    const newIds = e.target.checked
                                                                        ? [...currentIds, p.id]
                                                                        : currentIds.filter(id => id !== p.id);
                                                                    return { ...prevData, lockedPuzzleIds: newIds };
                                                                });
                                                            }} />
                                                            {p.name}
                                                          </label>
                                                        ))}
                                                    </div>
                                                )
                                              })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Locked Rooms */}
                                <div className="relative" ref={modalRoomsDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Rooms</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleRoomsDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.lockedRoomIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleRoomsDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleRoomsDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input 
                                                    type="text"
                                                    value={modalPuzzleRoomsSearch}
                                                    onChange={(e) => setModalPuzzleRoomsSearch(e.target.value)}
                                                    placeholder="Search rooms..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto p-2">
                                              {game.rooms.filter(r => r.id !== currentRoom.id && r.name.toLowerCase().includes(modalPuzzleRoomsSearch.toLowerCase())).map(room => (
                                                <label key={room.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                  <input type="checkbox" checked={modalPuzzleData.lockedRoomIds?.includes(room.id)} onChange={e => {
                                                      setModalPuzzleData(prevData => {
                                                          if (!prevData) return null;
                                                          const currentIds = prevData.lockedRoomIds || [];
                                                          const newIds = e.target.checked
                                                              ? [...currentIds, room.id]
                                                              : currentIds.filter(id => id !== room.id);
                                                          return { ...prevData, lockedRoomIds: newIds };
                                                      });
                                                  }} />
                                                  {room.name}
                                                </label>
                                              ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Locked Room Solves */}
                                <div className="relative" ref={modalRoomSolvesDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Room Solves</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleRoomSolvesDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.lockedRoomSolveIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleRoomSolvesDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleRoomSolvesDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input 
                                                    type="text"
                                                    value={modalPuzzleRoomSolvesSearch}
                                                    onChange={(e) => setModalPuzzleRoomSolvesSearch(e.target.value)}
                                                    placeholder="Search rooms..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto p-2">
                                              {(() => {
                                                const filteredRooms = game.rooms.filter(room => 
                                                  (room.solvedImage || (room.solvedNotes && room.solvedNotes.trim() !== '')) && 
                                                  room.name.toLowerCase().includes(modalPuzzleRoomSolvesSearch.toLowerCase())
                                                );

                                                if (filteredRooms.length === 0) {
                                                  return (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic p-2">
                                                      No rooms with a defined Solved State found.
                                                    </p>
                                                  );
                                                }
                                                
                                                return filteredRooms.map(room => (
                                                  <label key={room.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                    <input 
                                                      type="checkbox" 
                                                      checked={modalPuzzleData.lockedRoomSolveIds?.includes(room.id)} 
                                                      onChange={e => {
                                                          setModalPuzzleData(prevData => {
                                                              if (!prevData) return null;
                                                              const currentIds = prevData.lockedRoomSolveIds || [];
                                                              const newIds = e.target.checked
                                                                  ? [...currentIds, room.id]
                                                                  : currentIds.filter(id => id !== room.id);
                                                              return { ...prevData, lockedRoomSolveIds: newIds };
                                                          });
                                                      }}
                                                    />
                                                    {room.name}
                                                  </label>
                                                ));
                                              })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Locked Acts */}
                                <div className="relative" ref={modalActsDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Locked Acts</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleActsDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.lockedActNumbers?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleActsDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleActsDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input
                                                    type="text"
                                                    value={modalPuzzleActsSearch}
                                                    onChange={(e) => setModalPuzzleActsSearch(e.target.value)}
                                                    placeholder="Search acts..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto p-2">
                                              {allGameActs
                                                .filter(act => `Act ${act}`.toLowerCase().includes(modalPuzzleActsSearch.toLowerCase()))
                                                .map(act => (
                                                  <label key={act} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={modalPuzzleData.lockedActNumbers?.includes(act)}
                                                      onChange={e => {
                                                          setModalPuzzleData(prevData => {
                                                              if (!prevData) return null;
                                                              const currentNumbers = prevData.lockedActNumbers || [];
                                                              const newNumbers = e.target.checked
                                                                  ? [...currentNumbers, act]
                                                                  : currentNumbers.filter(num => num !== act);
                                                              return { ...prevData, lockedActNumbers: newNumbers };
                                                          });
                                                      }}
                                                    />
                                                    Act {act}
                                                  </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Column 2: When solved */}
                            <div className="space-y-4 mt-4 md:mt-0">
                                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">When solved</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">What happens when the puzzle is solved.</p>

                                {/* Objects discarded */}
                                <div className="relative" ref={modalDiscardObjectsDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Objects discarded</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleDiscardObjectsDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.discardObjectIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleDiscardObjectsDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleDiscardObjectsDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input 
                                                    type="text"
                                                    value={modalPuzzleDiscardObjectsSearch}
                                                    onChange={(e) => setModalPuzzleDiscardObjectsSearch(e.target.value)}
                                                    placeholder="Search objects..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto">
                                                {game.rooms.map(room => {
                                                    const filteredObjects = room.objects.filter(obj => 
                                                        obj.name.toLowerCase().includes(modalPuzzleDiscardObjectsSearch.toLowerCase())
                                                    );
                                                    if (filteredObjects.length === 0) return null;
                                                    return (
                                                        <div key={room.id} className="p-2">
                                                            <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                            {filteredObjects.map(obj => (
                                                              <label key={obj.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                                <input type="checkbox" checked={modalPuzzleData.discardObjectIds?.includes(obj.id)} onChange={e => {
                                                                    setModalPuzzleData(prevData => {
                                                                        if (!prevData) return null;
                                                                        const currentIds = prevData.discardObjectIds || [];
                                                                        const newIds = e.target.checked
                                                                            ? [...currentIds, obj.id]
                                                                            : currentIds.filter(id => id !== obj.id);
                                                                        return { ...prevData, discardObjectIds: newIds };
                                                                    });
                                                                }} />
                                                                {obj.name}
                                                              </label>
                                                            ))}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Actions completed */}
                                <div className="relative" ref={modalCompletedActionsDropdownRef}>
                                    <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Actions completed</h4>
                                    <button type="button" onClick={() => setOpenModalPuzzleCompletedActionsDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                                        <span>{`${modalPuzzleData.completedActionIds?.length || 0} selected`}</span>
                                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openModalPuzzleCompletedActionsDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openModalPuzzleCompletedActionsDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                                                <input
                                                    type="text"
                                                    value={modalPuzzleCompletedActionsSearch}
                                                    onChange={(e) => setModalPuzzleCompletedActionsSearch(e.target.value)}
                                                    placeholder="Search actions..."
                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-y-auto">
                                              {game.rooms.map(room => {
                                                const filteredActions = (room.actions || []).filter(a =>
                                                    (a.name || 'Untitled Action').toLowerCase().includes(modalPuzzleCompletedActionsSearch.toLowerCase())
                                                );
                                                if (filteredActions.length === 0) return null;
                                                return (
                                                    <div key={room.id} className="p-2">
                                                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 py-1 px-2 -mx-2">{room.name}</h5>
                                                        {filteredActions.map(action => (
                                                          <label key={action.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer">
                                                            <input
                                                              type="checkbox"
                                                              checked={modalPuzzleData.completedActionIds?.includes(action.id)}
                                                              onChange={e => {
                                                                  setModalPuzzleData(prevData => {
                                                                      if (!prevData) return null;
                                                                      const currentIds = prevData.completedActionIds || [];
                                                                      const newIds = e.target.checked
                                                                          ? [...currentIds, action.id]
                                                                          : currentIds.filter(id => id !== action.id);
                                                                      return { ...prevData, completedActionIds: newIds };
                                                                  });
                                                              }}
                                                            />
                                                            {action.name || <span className="italic">Untitled Action</span>}
                                                          </label>
                                                        ))}
                                                    </div>
                                                )
                                              })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                      <input type="checkbox" className="disabled:opacity-50" checked={modalPuzzleData.autoAddLockedObjects} onChange={e => handleModalPuzzleChange('autoAddLockedObjects', e.target.checked)} disabled={!modalPuzzleData.lockedObjectIds || modalPuzzleData.lockedObjectIds.length === 0} />
                                      Automatically add locked objects to inventory upon solving.
                                    </label>
                                </div>
                            </div>
                        </div>
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Edit Action</h2>
                    <button onClick={() => setActionModalState(null)} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Icon as="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Action Name</label>
                        <input
                            type="text"
                            value={modalActionData.name}
                            onChange={(e) => handleModalActionChange('name', e.target.value)}
                            placeholder="e.g., Look under the rug"
                            className="w-full font-semibold px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Host Response</label>
                        <textarea
                            value={modalActionData.description}
                            onChange={(e) => handleModalActionChange('description', e.target.value)}
                            placeholder="e.g., You lift the corner of the rug and find a small, tarnished brass key."
                            rows={5}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm resize-y"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image (Full Screen Overlay)</label>
                            {modalActionData.image ? (
                                <div className="flex items-center gap-2">
                                    <img src={`${API_BASE_URL}/assets/${modalActionData.image}`} alt="Action preview" className="w-24 h-24 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                                    <button onClick={() => handleModalActionFileChange('image', null)} className="text-red-500 hover:text-red-700 text-xs self-end p-1">Clear Image</button>
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={(e) => handleModalActionFileChange('image', e.target.files?.[0] || null)} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sound</label>
                            {modalActionData.sound ? (
                                <div className="space-y-2">
                                    <AudioPreviewPlayer assetId={modalActionData.sound} />
                                    <button onClick={() => handleModalActionFileChange('sound', null)} className="text-red-500 hover:text-red-700 text-xs px-1">Clear Sound</button>
                                </div>
                            ) : (
                                <input type="file" accept="audio/*" onChange={(e) => handleModalActionFileChange('sound', e.target.files?.[0] || null)} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                            )}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                                checked={modalActionData.hideCompleteButton || false}
                                onChange={e => handleModalActionChange('hideCompleteButton', e.target.checked)}
                            />
                            Hide complete button and have a puzzle complete it automatically.
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
            onClick={() => setIsAssetManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <Icon as="gallery" className="w-5 h-5" />
            Assets
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <Icon as="settings" className="w-5 h-5" />
            Settings
          </button>
          <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-300 shadow">
            <Icon as="present" className="w-5 h-5" />
            Present
          </button>
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* Room List (Left Column) */}
        <div className="w-64 bg-white dark:bg-slate-800 p-4 flex flex-col border-r border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Rooms</h2>
            <div className="flex gap-1">
              <button onClick={addRoom} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full" title="Add Room">
                <Icon as="plus" className="w-5 h-5" />
              </button>
              <button onClick={deleteRoom} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full" title="Delete Selected Room">
                <Icon as="trash" className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div ref={roomsContainerRef} className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-2">
              {Object.entries(roomsByAct).map(([act, rooms]) => {
                  const actNumber = parseInt(act, 10);
                  const isCollapsed = collapsedActs[actNumber];
                  return (
                      <div key={act} className="border-t border-slate-200 dark:border-slate-700 first:border-t-0">
                          <button onClick={() => toggleActCollapse(actNumber)} className="w-full text-left font-semibold text-slate-500 dark:text-slate-400 py-2 flex justify-between items-center">
                              <span>Act {act}</span>
                               <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                          </button>
                          {!isCollapsed && rooms.map(room => (
                              <div
                                  key={room.id}
                                  draggable
                                  onDragStart={() => handleDragStart(room.originalIndex)}
                                  onDragOver={(e) => handleDragOver(e, room.originalIndex)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={() => handleDrop(room.originalIndex)}
                                  onDragEnd={handleDragEnd}
                                  className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 mb-2 relative
                                      ${room.originalIndex === selectedRoomIndex ? 'bg-brand-100 dark:bg-brand-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                                      ${draggedRoomIndex === room.originalIndex ? 'opacity-50' : ''}
                                  `}
                                  onClick={() => selectRoom(room.originalIndex)}
                              >
                                  {dropTargetIndex === room.originalIndex && (
                                      <div className={`absolute left-0 right-0 ${draggedRoomIndex !== null && draggedRoomIndex > room.originalIndex ? 'top-0' : 'bottom-0'} h-0.5 bg-brand-500`}></div>
                                  )}
                                  <Icon as="reorder" className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                  <span className="truncate">{room.name}</span>
                              </div>
                          ))}
                      </div>
                  );
              })}
          </div>
        </div>

        {/* Room Editor (Center Column) */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6">
          <div className="flex items-baseline gap-4 mb-4">
              <input 
                  type="text" 
                  value={editingRoomName} 
                  onChange={e => setEditingRoomName(e.target.value)}
                  className="text-2xl font-bold bg-transparent focus:bg-white dark:focus:bg-slate-800 outline-none rounded-md px-2 py-1 flex-grow"
              />
              <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Act:</label>
                  <input
                      type="number"
                      value={editingRoomAct}
                      onChange={e => setEditingRoomAct(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      min="1"
                      className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                  />
              </div>
          </div>
          
          <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">Room Background Color</h3>
                  {game.globalBackgroundColor && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 italic">Global color is active</span>
                  )}
              </div>
              <div className={`flex flex-wrap gap-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg ${game.globalBackgroundColor ? 'opacity-50' : ''}`}>
                  {COLORS.map(color => (
                      <button 
                          key={color} 
                          onClick={() => changeRoomProperty('backgroundColor', color)} 
                          disabled={!!game.globalBackgroundColor}
                          className={`w-8 h-8 rounded-full border-2 ${currentRoom.backgroundColor === color ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-300 dark:border-slate-600'} ${game.globalBackgroundColor ? 'cursor-not-allowed' : ''}`} 
                          style={{backgroundColor: color}}
                      />
                  ))}
              </div>
          </div>
          
           {/* IMAGE UPLOADERS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {['image', 'mapImage', 'solvedImage'].map(prop => {
                const title = { image: 'Room Image', mapImage: 'Map Image', solvedImage: 'Solved State Image' }[prop] || '';
                const imageId = currentRoom[prop as keyof RoomType] as string | null;
                return (
                    <div key={prop}>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
                        <div className="relative group w-full aspect-video bg-slate-100 dark:bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                            {imageId && <img src={`${API_BASE_URL}/assets/${imageId}`} alt={title} className="w-full h-full object-cover rounded-lg" />}
                            <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], prop as 'image' | 'mapImage' | 'solvedImage')} className="sr-only" />
                                {!imageId && (
                                    <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                        <Icon as="gallery" className="w-10 h-10 mx-auto" />
                                        <p className="text-xs mt-1">Upload Image</p>
                                    </div>
                                )}
                            </label>
                            {(imageId || !imageId) && (
                              <div className="absolute inset-0 bg-black/60 p-2 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <label className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors cursor-pointer">
                                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], prop as 'image' | 'mapImage' | 'solvedImage')} className="sr-only" />
                                  <Icon as="edit" className="w-3.5 h-3.5" />
                                  Upload New
                                </label>
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary(prop as 'image' | 'mapImage' | 'solvedImage'); }}
                                  className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                >
                                  <Icon as="gallery" className="w-3.5 h-3.5" />
                                  From Library
                                </button>
                                {imageId && (
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeRoomProperty(prop as keyof RoomType, null); }}
                                    className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                    title="Clear Image"
                                  >
                                    <Icon as="trash" className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                    </div>
                );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer mb-6">
            <input 
              type="checkbox" 
              checked={currentRoom.isFullScreenImage} 
              onChange={e => changeRoomProperty('isFullScreenImage', e.target.checked)} 
            />
            Display main room image full-screen (hides sidebar).
          </label>
          
          {/* Room Descriptions */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Room Description</h3>
                <button onClick={() => setModalContent({ type: 'notes', content: editingRoomNotes })} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500" title="Edit in fullscreen">
                  <Icon as="expand" className="w-4 h-4"/>
                </button>
              </div>
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
                  placeholder="The room is dark and smells of mildew..."
                  className="w-full h-48 px-3 py-2 border border-t-0 border-slate-300 dark:border-slate-600 rounded-b-lg bg-slate-50 dark:bg-slate-700 focus:outline-none resize-y"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">Solved Description</h3>
                  <button onClick={() => setModalContent({ type: 'solvedNotes', content: editingRoomSolvedNotes })} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500" title="Edit in fullscreen">
                    <Icon as="expand" className="w-4 h-4"/>
                  </button>
              </div>
              <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-t-lg bg-slate-50 dark:bg-slate-700/50 p-1">
                  <button onClick={() => applyFormatting('bold', 'solvedNotes')} title="Bold" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded font-bold">B</button>
                  <button onClick={() => applyFormatting('italic', 'solvedNotes')} title="Italic" className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded italic">I</button>
                  <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                  <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'y')} title="Highlight Yellow" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                      <div className="w-4 h-4 rounded-sm bg-yellow-400 border border-yellow-500"></div>
                  </button>
                  <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'c')} title="Highlight Cyan" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                      <div className="w-4 h-4 rounded-sm bg-cyan-400 border border-cyan-500"></div>
                  </button>
                  <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'm')} title="Highlight Pink" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                      <div className="w-4 h-4 rounded-sm bg-pink-400 border border-pink-500"></div>
                  </button>
                  <button onClick={() => applyFormatting('highlight', 'solvedNotes', 'l')} title="Highlight Lime" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                      <div className="w-4 h-4 rounded-sm bg-lime-400 border border-lime-500"></div>
                  </button>
              </div>
              <textarea 
                  ref={solvedDescriptionTextareaRef}
                  value={editingRoomSolvedNotes} 
                  onChange={e => setEditingRoomSolvedNotes(e.target.value)} 
                  placeholder="The room is now brightly lit..."
                  className="w-full h-48 px-3 py-2 border border-t-0 border-slate-300 dark:border-slate-600 rounded-b-lg bg-slate-50 dark:bg-slate-700 focus:outline-none resize-y"
              />
            </div>
          </div>
          <div className="mt-4">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">When entering this room</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Automatically remove objects from player inventory.
              </p>
              <div className="relative" ref={objectRemoveDropdownRef}>
                  <button type="button" onClick={() => setOpenObjectRemoveDropdown(prev => !prev)} className="w-full text-left px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm">
                      <span>{`${currentRoom.objectRemoveIds?.length || 0} objects selected`}</span>
                      <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${openObjectRemoveDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {openObjectRemoveDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg flex flex-col max-h-60">
                          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                              <input 
                                  type="text"
                                  value={objectRemoveSearch}
                                  onChange={(e) => setObjectRemoveSearch(e.target.value)}
                                  placeholder="Search all game objects..."
                                  className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                              />
                          </div>
                          <div className="overflow-y-auto p-2">
                              {filteredObjectsForRemoval.length > 0 ? (
                                  filteredObjectsForRemoval.map(obj => (
                                      <label key={obj.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                          <input 
                                              type="checkbox" 
                                              checked={currentRoom.objectRemoveIds?.includes(obj.id)} 
                                              onChange={e => {
                                                  const currentIds = currentRoom.objectRemoveIds || [];
                                                  const newIds = e.target.checked
                                                      ? [...currentIds, obj.id]
                                                      : currentIds.filter(id => id !== obj.id);
                                                  changeRoomProperty('objectRemoveIds', newIds);
                                              }}
                                          />
                                          <span className="truncate">{obj.name} <span className="text-xs text-slate-400">({obj.roomName})</span></span>
                                      </label>
                                  ))
                              ) : (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2">No matching objects found.</p>
                              )}
                          </div>
                      </div>
                  )}
              </div>
              <textarea 
                  value={editingRoomObjectRemoveText} 
                  onChange={e => setEditingRoomObjectRemoveText(e.target.value)} 
                  placeholder="Optional text to show players when objects are removed."
                  className="w-full mt-2 h-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none resize-y text-sm"
              />
          </div>
        </div>

        {/* Dynamic Content (Right Column) */}
        <div className="w-96 bg-white dark:bg-slate-800 p-4 flex flex-col border-l border-slate-200 dark:border-slate-700">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">
              <div>
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Objects in this Room</h3>
                      <button onClick={addObject} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full" title="Add Object">
                          <Icon as="plus" className="w-5 h-5" />
                      </button>
                  </div>
                  <div ref={objectsContainerRef} className="space-y-4">
                      {editingRoomObjects.map((obj, index) => {
                         const locks = objectLockMap.get(obj.id);
                         return (
                            <div key={obj.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{obj.name || <span className="italic text-slate-500">Untitled Object</span>}</p>
                                      {locks && (
                                        <div className="flex items-center gap-1 text-xs text-red-500 mt-1" title={`Locked by: ${locks.join(', ')}`}>
                                          <Icon as="lock" className="w-3 h-3"/>
                                          <span>Locked</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setObjectModalState({ object: { ...obj }, index })} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full" title="Edit Object">
                                        <Icon as="edit" className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => deleteObject(index)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full" title="Delete Object">
                                        <Icon as="trash" className="w-4 h-4" />
                                      </button>
                                    </div>
                                </div>
                            </div>
                         )
                      })}
                      {editingRoomObjects.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 italic">No objects in this room.</p>}
                  </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Puzzles in this Room</h3>
                  <button onClick={addPuzzle} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full" title="Add Puzzle">
                      <Icon as="plus" className="w-5 h-5" />
                  </button>
                </div>
                <div ref={puzzlesContainerRef} className="space-y-2">
                    {editingRoomPuzzles.map((puzzle, index) => {
                      const locks = puzzleLockMap.get(puzzle.id);
                      return (
                        <div 
                          key={puzzle.id} 
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex-grow min-w-0">
                            <p className="font-semibold truncate">{puzzle.name || <span className="italic text-slate-500">Untitled Puzzle</span>}</p>
                            {locks && (
                              <div className="flex items-center gap-1 text-xs text-red-500 mt-1" title={`Locked by: ${locks.join(', ')}`}>
                                <Icon as="lock" className="w-3 h-3"/>
                                <span>Locked</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setPuzzleModalState({ puzzle: { ...puzzle }, index })} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full" title="Edit Puzzle">
                              <Icon as="edit" className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => handleDeletePuzzle(e, index)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full" title="Delete Puzzle">
                              <Icon as="trash" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {editingRoomPuzzles.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 italic">No puzzles in this room.</p>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Player Actions & Host Responses</h3>
                  <button onClick={addAction} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full" title="Add Action">
                      <Icon as="plus" className="w-5 h-5" />
                  </button>
                </div>
                <div ref={actionsContainerRef} className="space-y-2">
                    {(editingRoomActions).map((action, index) => {
                      const locks = actionLockMap.get(action.id);
                      return (
                        <div 
                          key={action.id} 
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex-grow min-w-0">
                            <p className="font-semibold truncate">{action.name || <span className="italic text-slate-500">Untitled Action</span>}</p>
                            {locks && (
                              <div className="flex items-center gap-1 text-xs text-red-500 mt-1" title={`Locked by: ${locks.join(', ')}`}>
                                <Icon as="lock" className="w-3 h-3"/>
                                <span>Locked</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setActionModalState({ action: { ...action }, index })} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full" title="Edit Action">
                              <Icon as="edit" className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => handleDeleteAction(e, index)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full" title="Delete Action">
                              <Icon as="trash" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {editingRoomActions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 italic">No actions in this room.</p>}
                </div>
              </div>
          </div>
          <div className="flex-shrink-0 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Player View Preview</h3>
                {hasSolvedState && (
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <span>Show Solved State</span>
                        <input
                            type="checkbox"
                            checked={previewSolved}
                            onChange={e => setPreviewSolved(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                )}
            </div>
            <div className="mt-2 aspect-video w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
              <Room
                room={{...currentRoom, isSolved: previewSolved}}
                inventoryItems={inventoryItems}
                visibleMapImages={visibleMapImages}
                globalBackgroundColor={game.globalBackgroundColor}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Editor;
