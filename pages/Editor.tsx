

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, Room as RoomType, InventoryObject, Puzzle, Action, Asset } from '../types';
import Room from '../components/Slide';
import Icon from '../components/Icon';
import Accordion from '../components/Accordion';
import { generateUUID } from '../utils/uuid';
import AudioPreviewPlayer from '../components/AudioPreviewPlayer';

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
  const [assetModalTarget, setAssetModalTarget] = useState<'image' | 'mapImage' | 'solvedImage' | { type: 'object'; index: number } | null>(null);
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
  const [modalPuzzleObjectsSearch, setModalPuzzleObjectsSearch] = useState('');
  const [modalPuzzleDiscardObjectsSearch, setModalPuzzleDiscardObjectsSearch] = useState('');
  const [modalPuzzlePuzzlesSearch, setModalPuzzlePuzzlesSearch] = useState('');
  const [modalPuzzleRoomsSearch, setModalPuzzleRoomsSearch] = useState('');
  const [modalPuzzleRoomSolvesSearch, setModalPuzzleRoomSolvesSearch] = useState('');
  const [modalPuzzleActionsSearch, setModalPuzzleActionsSearch] = useState('');
  const [modalPuzzleCompletedActionsSearch, setModalPuzzleCompletedActionsSearch] = useState('');
  const [actionModalState, setActionModalState] = useState<{ action: Action; index: number } | null>(null);
  const [modalActionData, setModalActionData] = useState<Action | null>(null);
  const [collapsedActs, setCollapsedActs] = useState<Record<number, boolean>>({});
  const [expandedObjectIds, setExpandedObjectIds] = useState<Set<string>>(new Set());


  const objectRemoveDropdownRef = useRef<HTMLDivElement>(null);
  const modalObjectsDropdownRef = useRef<HTMLDivElement>(null);
  const modalDiscardObjectsDropdownRef = useRef<HTMLDivElement>(null);
  const modalRoomsDropdownRef = useRef<HTMLDivElement>(null);
  const modalPuzzlesDropdownRef = useRef<HTMLDivElement>(null);
  const modalRoomSolvesDropdownRef = useRef<HTMLDivElement>(null);
  const modalActionsDropdownRef = useRef<HTMLDivElement>(null);
  const modalCompletedActionsDropdownRef = useRef<HTMLDivElement>(null);
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
  useDebouncedUpdater(editingRoomObjects, 'objects');
  useDebouncedUpdater(editingRoomPuzzles, 'puzzles');
  useDebouncedUpdater(editingRoomActions, 'actions');
  
  useEffect(() => {
    setModalPuzzleData(puzzleModalState ? puzzleModalState.puzzle : null);
  }, [puzzleModalState]);

  useEffect(() => {
    setModalActionData(actionModalState ? actionModalState.action : null);
  }, [actionModalState]);

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
  
  const openAssetLibrary = (target: 'image' | 'mapImage' | 'solvedImage' | { type: 'object', index: number }) => {
      setAssetModalTarget(target);
      setIsAssetModalOpen(true);
  };

  const handleSelectAsset = (assetId: string) => {
      if (!assetModalTarget) return;

      if (typeof assetModalTarget === 'string') {
          changeRoomProperty(assetModalTarget, assetId);
      } else if (assetModalTarget.type === 'object') {
          const newObjects = [...editingRoomObjects];
          if (newObjects[assetModalTarget.index]) {
              newObjects[assetModalTarget.index] = { ...newObjects[assetModalTarget.index], image: assetId };
              setEditingRoomObjects(newObjects);
          }
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
    setEditingRoomObjects([...editingRoomObjects, newObject]);
    setTimeout(() => {
        objectsContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }

  const handleObjectChange = (index: number, field: keyof InventoryObject, value: string | boolean | null) => {
    const newObjects = [...editingRoomObjects];
    newObjects[index] = { ...newObjects[index], [field]: value };
    setEditingRoomObjects(newObjects);
  }

  const handleObjectFileUpload = async (file: File, index: number) => {
    if (!game) return;
    try {
        const { assetId } = await gameService.uploadAsset(game.id, file);
        const newObjects = [...editingRoomObjects];
        newObjects[index] = { ...newObjects[index], image: assetId };
        setEditingRoomObjects(newObjects);
        
        const assets = await gameService.getAssetsForGame(game.id);
        setAssetLibrary(assets);
    } catch (error) {
        console.error(`Object image upload failed:`, error);
        alert(`Failed to upload object image. Please try again.`);
    }
  };

  const deleteObject = (index: number) => {
    setEditingRoomObjects(editingRoomObjects.filter((_, i) => i !== index));
  }
  
  const toggleObjectExpansion = (objectId: string) => {
    setExpandedObjectIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(objectId)) {
            newSet.delete(objectId);
        } else {
            newSet.add(objectId);
        }
        return newSet;
    });
  };

  const addPuzzle = () => {
    const newPuzzle: Puzzle = { id: generateUUID(), name: 'New Puzzle', answer: '', isSolved: false, unsolvedText: '', solvedText: '', image: null, sound: null, showImageOverlay: false, lockedObjectIds: [], discardObjectIds: [], lockedRoomIds: [], lockedPuzzleIds: [], lockedRoomSolveIds: [], lockedActionIds: [], completedActionIds: [], autoAddLockedObjects: false };
    const newPuzzles = [...editingRoomPuzzles, newPuzzle];
    setEditingRoomPuzzles(newPuzzles);
    
    // Automatically open the modal for the new puzzle
    const newPuzzleIndex = newPuzzles.length - 1;
    setPuzzleModalState({ puzzle: { ...newPuzzle }, index: newPuzzleIndex });
    setModalPuzzleObjectsSearch('');
    setModalPuzzleDiscardObjectsSearch('');
    setModalPuzzlePuzzlesSearch('');
    setModalPuzzleRoomsSearch('');
    setModalPuzzleRoomSolvesSearch('');
    setModalPuzzleActionsSearch('');
    setModalPuzzleCompletedActionsSearch('');
  };

  const deletePuzzle = (index: number) => {
    setEditingRoomPuzzles(editingRoomPuzzles.filter((_, i) => i !== index));
  };

  const handleDeletePuzzle = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    deletePuzzle(index);
  };

  const addAction = () => {
    const newAction: Action = { id: generateUUID(), name: '', description: '', image: null, sound: null, showImageOverlay: false, isComplete: false };
    const newActions = [...editingRoomActions, newAction];
    setEditingRoomActions(newActions);
    
    // Automatically open the modal for the new action
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
      if (!actionModalState || !modalActionData) return;
      const newActions = [...editingRoomActions];
      newActions[actionModalState.index] = modalActionData;
      setEditingRoomActions(newActions);
      setActionModalState(null);
  };

  const deleteAction = (index: number) => {
      setEditingRoomActions(editingRoomActions.filter((_, i) => i !== index));
  };
  
  const handleDeleteAction = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    deleteAction(index);
  };
  
  const handleModalPuzzleChange = (field: keyof Puzzle, value: string | boolean | string[] | null) => {
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
    if (!puzzleModalState || !modalPuzzleData) return;
    const newPuzzles = [...editingRoomPuzzles];
    newPuzzles[puzzleModalState.index] = modalPuzzleData;
    setEditingRoomPuzzles(newPuzzles);
    setPuzzleModalState(null);
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
                showImageOverlay: false,
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
                                    <img src={`/api/assets/${asset.id}`} alt="Game asset" className="w-full h-full object-cover"/>
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
                                        <img src={`/api/assets/${asset.id}`} alt={asset.name} className="w-full h-full object-cover"/>
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
                                    <img src={`/api/assets/${modalPuzzleData.image}`} alt="Puzzle preview" className="w-24 h-24 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
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
                                                                        const newLockedIds = e.target.checked 
                                                                            ? [...modalPuzzleData.lockedObjectIds, obj.id] 
                                                                            : modalPuzzleData.lockedObjectIds.filter(id => id !== obj.id);
                                                                        handleModalPuzzleChange('lockedObjectIds', newLockedIds);
                                                                        if (e.target.checked && newLockedIds.length > 0) {
                                                                            handleModalPuzzleChange('autoAddLockedObjects', true);
                                                                        }
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
                                                              onChange={e => handleModalPuzzleChange('lockedActionIds', e.target.checked ? [...(modalPuzzleData.lockedActionIds || []), action.id] : (modalPuzzleData.lockedActionIds || []).filter(id => id !== action.id))}
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
                                                          <label key={p.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer"><input type="checkbox" checked={modalPuzzleData.lockedPuzzleIds?.includes(p.id)} onChange={e => handleModalPuzzleChange('lockedPuzzleIds', e.target.checked ? [...modalPuzzleData.lockedPuzzleIds, p.id] : modalPuzzleData.lockedPuzzleIds.filter(id => id !== p.id))} />{p.name}</label>
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
                                                <label key={room.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer"><input type="checkbox" checked={modalPuzzleData.lockedRoomIds?.includes(room.id)} onChange={e => handleModalPuzzleChange('lockedRoomIds', e.target.checked ? [...modalPuzzleData.lockedRoomIds, room.id] : modalPuzzleData.lockedRoomIds.filter(id => id !== room.id))} />{room.name}</label>
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
                                                      onChange={e => handleModalPuzzleChange('lockedRoomSolveIds', e.target.checked ? [...modalPuzzleData.lockedRoomSolveIds, room.id] : modalPuzzleData.lockedRoomSolveIds.filter(id => id !== room.id))} 
                                                    />
                                                    {room.name}
                                                  </label>
                                                ));
                                              })()}
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
                                                              <label key={obj.id} className="flex items-center gap-2 text-sm p-1 cursor-pointer"><input type="checkbox" checked={modalPuzzleData.discardObjectIds?.includes(obj.id)} onChange={e => handleModalPuzzleChange('discardObjectIds', e.target.checked ? [...(modalPuzzleData.discardObjectIds || []), obj.id] : (modalPuzzleData.discardObjectIds || []).filter(id => id !== obj.id))} />{obj.name}</label>
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
                                                              onChange={e => handleModalPuzzleChange('completedActionIds', e.target.checked ? [...(modalPuzzleData.completedActionIds || []), action.id] : (modalPuzzleData.completedActionIds || []).filter(id => id !== action.id))}
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
                                    <img src={`/api/assets/${modalActionData.image}`} alt="Action preview" className="w-24 h-24 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
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
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Thumbnails */}
        <aside className="w-48 bg-white dark:bg-slate-800 p-2 overflow-y-auto shadow-lg">
            <div ref={roomsContainerRef}>
              {Object.entries(roomsByAct).sort(([a], [b]) => Number(a) - Number(b)).map(([act, rooms]) => (
                <div key={`act-${act}`}>
                    <button 
                      onClick={() => toggleActCollapse(Number(act))}
                      className="w-full flex justify-between items-center text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                    >
                        <span>Act {act}</span>
                        <Icon as="chevron-down" className={`w-4 h-4 transition-transform ${!collapsedActs[Number(act)] ? 'rotate-180' : ''}`} />
                    </button>
                  {!collapsedActs[Number(act)] && (
                    <div className="space-y-2 mt-1">
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
                  )}
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
              <div className="flex justify-end mb-2 h-6">
                {hasSolvedState && (
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
                )}
              </div>
              <div className="relative w-full aspect-video">
                <Room room={{...currentRoom, isSolved: previewSolved}} inventoryItems={inventoryItems} visibleMapImages={visibleMapImages} globalBackgroundColor={game.globalBackgroundColor} />
                <div className={`absolute inset-0 flex ${currentRoom.isFullScreenImage ? 'pointer-events-none' : ''}`}>
                  <div className={`h-full group relative ${currentRoom.isFullScreenImage ? 'w-full' : 'w-[70%]'}`}>
                      <label className={`w-full h-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors duration-300 ${currentRoom.isFullScreenImage ? 'pointer-events-auto' : ''}`}>
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} className="sr-only" />
                          {!currentRoom.image && (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="text-white text-center pointer-events-none">
                                    <p className="font-bold text-lg">Upload New Image</p>
                                    <p className="text-sm">Click or drag & drop</p>
                                </div>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('image'); }}
                                    className="pointer-events-auto flex items-center gap-2 text-sm px-3 py-1.5 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                >
                                    <Icon as="gallery" className="w-4 h-4" />
                                    Select existing image
                                </button>
                            </div>
                          )}
                      </label>
                      {currentRoom.image && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('image'); }}
                                  className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                  title="Select an existing image"
                                >
                                  <Icon as="gallery" className="w-3.5 h-3.5" />
                                  Select an existing image
                              </button>
                              <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeRoomProperty('image', null); }}
                                  className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                  aria-label="Clear room image"
                                  title="Clear Image"
                                >
                                  <Icon as="trash" className="w-4 h-4" />
                              </button>
                          </div>
                      )}
                  </div>
                   <div className={`h-full ${currentRoom.isFullScreenImage ? 'hidden' : 'w-[30%]'}`}>
                     <div className="h-1/2 relative group">
                          <label className="w-full h-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors duration-300">
                              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'mapImage')} className="sr-only" />
                              {!currentRoom.mapImage && (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                                    <div className="text-white text-center pointer-events-none">
                                        <p className="font-bold text-sm">Upload New</p>
                                        <p className="text-xs">Map Image</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('mapImage'); }}
                                        className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                    >
                                        <Icon as="gallery" className="w-3.5 h-3.5" />
                                        Select existing image
                                    </button>
                                </div>
                              )}
                          </label>
                           {currentRoom.mapImage && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                  <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('mapImage'); }}
                                      className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                      title="Select an existing image"
                                  >
                                      <Icon as="gallery" className="w-3.5 h-3.5" />
                                      Select an existing image
                                  </button>
                                  <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeRoomProperty('mapImage', null); }}
                                      className="pointer-events-auto p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                      aria-label="Clear map image"
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
            </div>
            
            <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-3 text-slate-700 dark:text-slate-300">Objects</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2" ref={objectsContainerRef}>
                  {editingRoomObjects.length > 0 ? editingRoomObjects.map((obj, index) => {
                    const lockingPuzzles = objectLockMap.get(obj.id);
                    const isExpanded = expandedObjectIds.has(obj.id);
                    return (
                        <div key={obj.id} className="grid grid-cols-12 gap-2 items-start py-1">
                            <div className="col-span-4 flex items-center gap-2 pt-1">
                                {lockingPuzzles && (
                                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 flex-shrink-0" title={`Locked by: ${lockingPuzzles.join(', ')}`}>
                                        <Icon as="lock" className="w-4 h-4" />
                                        {lockingPuzzles.length > 1 && (
                                            <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 rounded-full h-4 w-4 flex items-center justify-center">
                                                {lockingPuzzles.length}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={obj.name}
                                    onChange={(e) => handleObjectChange(index, 'name', e.target.value)}
                                    placeholder="Object name"
                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                />
                            </div>

                            <div className="col-span-7">
                                {!isExpanded ? (
                                    <input
                                        type="text"
                                        value={obj.description}
                                        onChange={(e) => handleObjectChange(index, 'description', e.target.value)}
                                        placeholder="Description"
                                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm"
                                    />
                                ) : (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-md space-y-3">
                                        <textarea
                                            value={obj.description}
                                            onChange={(e) => handleObjectChange(index, 'description', e.target.value)}
                                            placeholder="Description"
                                            rows={3}
                                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm resize-y"
                                        />
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1 text-slate-600 dark:text-slate-400">Object Image</h4>
                                            <div className="relative group w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                                                {obj.image && (
                                                    <img src={`/api/assets/${obj.image}`} alt={obj.name} className="w-full h-full object-cover rounded-md" />
                                                )}
                                                <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                                                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleObjectFileUpload(e.target.files[0], index)} className="sr-only" />
                                                    {!obj.image && (
                                                        <>
                                                            <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                                                <Icon as="gallery" className="w-8 h-8 mx-auto" />
                                                                <p className="text-xs mt-1">Add Image</p>
                                                            </div>
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="pointer-events-none text-white text-center">
                                                                    <p className="font-bold text-xs">Upload New</p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary({ type: 'object', index }); }}
                                                                    className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center"
                                                                >
                                                                    <Icon as="gallery" className="w-3.5 h-3.5" />
                                                                    Library
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </label>
                                                {obj.image && (
                                                    <div className="absolute inset-0 bg-black/60 p-1 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary({ type: 'object', index }); }}
                                                            className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                                            title="Select an existing image"
                                                        >
                                                            <Icon as="gallery" className="w-3.5 h-3.5" />
                                                            Change
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleObjectChange(index, 'image', null); }}
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
                                )}
                            </div>
                            
                            <div className="col-span-1 flex flex-col items-center justify-start gap-2 pt-1">
                                <button onClick={() => toggleObjectExpansion(obj.id)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded-full">
                                    <Icon as={isExpanded ? 'collapse' : 'expand'} className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteObject(index)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full">
                                  <Icon as="trash" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                  }) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No objects for this room.</p>
                  )}
                </div>
                <button onClick={addObject} className="mt-3 flex items-center gap-2 text-sm px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 rounded-md hover:bg-brand-200 dark:hover:bg-brand-900">
                  <Icon as="plus" className="w-4 h-4"/> Add Object
                </button>
            </div>

            <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-1 text-slate-700 dark:text-slate-300">Puzzles</h3>
                <p className="text-xs italic text-slate-500 dark:text-slate-400 mb-3">Puzzles lock other elements.</p>
                 <div className="space-y-2 max-h-96 overflow-y-auto pr-2" ref={puzzlesContainerRef}>
                    {editingRoomPuzzles.length > 0 ? editingRoomPuzzles.map((puzzle, index) => {
                      const lockingPuzzles = puzzleLockMap.get(puzzle.id);
                      return (
                        <div
                            key={puzzle.id}
                            onClick={() => {
                                setPuzzleModalState({ puzzle: { ...puzzle }, index });
                                setModalPuzzleObjectsSearch('');
                                setModalPuzzlePuzzlesSearch('');
                                setModalPuzzleRoomsSearch('');
                                setModalPuzzleRoomSolvesSearch('');
                                setModalPuzzleActionsSearch('');
                                setModalPuzzleCompletedActionsSearch('');
                                setModalPuzzleDiscardObjectsSearch('');
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${index % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-700/50'}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                             {lockingPuzzles && (
                                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 flex-shrink-0" title={`Locked by: ${lockingPuzzles.join(', ')}`}>
                                  <Icon as="lock" className="w-4 h-4" />
                                  {lockingPuzzles.length > 1 && (
                                    <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 rounded-full h-4 w-4 flex items-center justify-center">
                                      {lockingPuzzles.length}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{puzzle.name}</span>
                          </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={(e) => handleDeletePuzzle(e, index)}
                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center"
                                    title="Delete Puzzle"
                                >
                                    <Icon as="trash" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                      );
                    }) : (
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
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2" ref={actionsContainerRef}>
                    {editingRoomActions.length > 0 ? editingRoomActions.map((action, index) => {
                      const lockingPuzzles = actionLockMap.get(action.id);
                      return (
                        <div
                            key={action.id}
                            onClick={() => setActionModalState({ action: { ...action }, index })}
                            className={`flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${index % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-700/50'}`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                              {lockingPuzzles && (
                                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 flex-shrink-0" title={`Locked by: ${lockingPuzzles.join(', ')}`}>
                                  <Icon as="lock" className="w-4 h-4" />
                                  {lockingPuzzles.length > 1 && (
                                    <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 rounded-full h-4 w-4 flex items-center justify-center">
                                      {lockingPuzzles.length}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                                  {action.name || <span className="italic text-slate-500 dark:text-slate-400">Untitled Action</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={(e) => handleDeleteAction(e, index)}
                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center"
                                    title="Delete Action"
                                >
                                    <Icon as="trash" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                      );
                    }) : (
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
                <Accordion title="Object Removal">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Removed Objects</h3>
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
                            <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400">Removal Text</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Optional text to show the presenter in a pop-up when objects are removed.</p>
                            <textarea
                                value={editingRoomObjectRemoveText}
                                onChange={e => setEditingRoomObjectRemoveText(e.target.value)}
                                placeholder="e.g., The key dissolves in the lock..."
                                className="w-full h-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none text-sm"
                            />
                        </div>
                    </div>
                </Accordion>
                <Accordion 
                    title="Room Description" 
                    defaultOpen={true}
                    headerContent={
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalContent({ type: 'notes', content: editingRoomNotes });
                          }}
                          className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Edit in larger view"
                        >
                          <Icon as="expand" className="w-4 h-4" />
                        </button>
                    }
                >
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
                            <div className="relative group w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                                {currentRoom.solvedImage && (
                                    <img src={`/api/assets/${currentRoom.solvedImage}`} alt="Solved state preview" className="w-full h-full object-cover rounded-md" />
                                )}
                                <label className="absolute inset-0 cursor-pointer hover:bg-black/40 transition-colors rounded-md flex items-center justify-center">
                                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'solvedImage')} className="sr-only" />
                                    {!currentRoom.solvedImage && (
                                        <>
                                            {/* Default state: icon */}
                                            <div className="text-center text-slate-400 dark:text-slate-500 group-hover:opacity-0 transition-opacity">
                                                 <Icon as="gallery" className="w-8 h-8 mx-auto"/>
                                                 <p className="text-xs mt-1">Add Image</p>
                                            </div>
                                            {/* Hover state: upload text + library button */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <div className="pointer-events-none text-white text-center">
                                                    <p className="font-bold text-xs">Upload New</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('solvedImage'); }}
                                                    className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center"
                                                >
                                                  <Icon as="gallery" className="w-3.5 h-3.5" />
                                                  Select existing image
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </label>
                                {currentRoom.solvedImage && (
                                    <div className="absolute inset-0 bg-black/60 p-1 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAssetLibrary('solvedImage'); }}
                                            className="pointer-events-auto flex items-center gap-1.5 text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                                            title="Select an existing image"
                                        >
                                            <Icon as="gallery" className="w-3.5 h-3.5" />
                                            Select an existing image
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeRoomProperty('solvedImage', null); }}
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
                            <h3 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <span>Solved Description</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalContent({ type: 'solvedNotes', content: editingRoomSolvedNotes });
                                  }}
                                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                  title="Edit in larger view"
                                >
                                  <Icon as="expand" className="w-4 h-4" />
                                </button>
                            </h3>
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