
import React, { useState, useEffect } from 'react';
import type { Presentation } from '../types';
import Icon from './Icon';
import ObjectItem from './presenter/ObjectItem';
import PuzzleItem from './presenter/PuzzleItem';
import { usePresenterState } from '../hooks/usePresenterState';

interface PresenterPreviewProps {
  presentation: Presentation;
  currentRoomIndex: number;
  onToggleObject: (objectId: string, newState: boolean) => void;
  onTogglePuzzle: (puzzleId: string, newState: boolean) => void;
  onTogglePuzzleImage: (puzzleId: string, newState: boolean) => void;
  isExpanded: boolean;
  onClose?: () => void;
}

const PresenterPreview: React.FC<PresenterPreviewProps> = ({ presentation, currentRoomIndex: initialRoomIndex, onToggleObject, onTogglePuzzle, onTogglePuzzleImage, isExpanded, onClose }) => {
  const [currentRoomIndex, setCurrentRoomIndex] = useState(initialRoomIndex);
  const [visibleDescriptionIds, setVisibleDescriptionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCurrentRoomIndex(initialRoomIndex);
  }, [initialRoomIndex])

  const {
      allUnsolvedPuzzles,
      lockingPuzzlesByRoomId,
      // Fix: Corrected typo from `lockingPzzlesByPuzzleId` to `lockingPuzzlesByPuzzleId`.
      lockingPuzzlesByPuzzleId,
      inventoryObjects,
  } = usePresenterState(presentation);


  const handleToggleDescriptionVisibility = (objectId: string) => {
      setVisibleDescriptionIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(objectId)) {
              newSet.delete(objectId);
          } else {
              newSet.add(objectId);
          }
          return newSet;
      });
  };

  const currentRoom = presentation.rooms[currentRoomIndex];
  const availableObjects = currentRoom?.objects.filter(o => !o.showInInventory) || [];
  
  if (isExpanded) {
    return (
        <div className="h-full bg-slate-800 text-white flex flex-col rounded-lg">
            <header className="p-4 bg-slate-900 flex justify-between items-center flex-shrink-0 rounded-t-lg">
                <h1 className="text-xl font-bold">{presentation.title} - Presenter Preview</h1>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <Icon as="close" />
                    </button>
                )}
            </header>
            <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
                <div className="col-span-3 overflow-y-auto pr-2">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-800 py-2">Rooms</h2>
                    <div className="space-y-2">
                        {presentation.rooms.map((room, index) => {
                            const isLocked = lockingPuzzlesByRoomId.has(room.id);
                            const lockingPuzzleName = lockingPuzzlesByRoomId.get(room.id);
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => setCurrentRoomIndex(index)}
                                    disabled={isLocked}
                                    title={isLocked ? `Locked by: ${lockingPuzzleName}` : ''}
                                    className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col items-start ${
                                        currentRoomIndex === index
                                            ? 'bg-brand-600 text-white font-bold shadow-lg'
                                            : 'bg-slate-700'
                                    } ${isLocked ? 'opacity-50 cursor-not-allowed hover:bg-slate-700' : 'hover:bg-slate-600'}`}
                                >
                                    <div className="w-full flex items-center justify-between">
                                        <span className="text-lg truncate">{room.name}</span>
                                        {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />}
                                    </div>
                                    {isLocked && (
                                        <span className="text-xs text-red-400 mt-1 truncate">Locked by: {lockingPuzzleName}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="col-span-5 bg-slate-900 rounded-lg p-6 overflow-y-auto flex flex-col">
                    {currentRoom && (
                    <>
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900 py-2">Room Description</h2>
                            <div className="prose prose-invert prose-lg max-w-none whitespace-pre-wrap text-slate-200">
                                {currentRoom.notes || <span className="text-slate-400">No description for this room.</span>}
                            </div>
                        </div>
                        {currentRoom.puzzles && currentRoom.puzzles.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                            <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900 py-2 flex items-baseline gap-2">
                                <span>Puzzles</span>
                                <span className="text-xs font-normal text-slate-400">(Toggle to solve)</span>
                            </h2>
                            <div className="space-y-4">
                            {currentRoom.puzzles.map(puzzle => {
                                // Fix: Corrected typo from `lockingPzzlesByPuzzleId` to `lockingPuzzlesByPuzzleId`.
                                const lockingPuzzleName = lockingPuzzlesByPuzzleId.get(puzzle.id);
                                return (
                                  <PuzzleItem 
                                    key={puzzle.id} 
                                    puzzle={puzzle} 
                                    onToggle={onTogglePuzzle} 
                                    onToggleImage={onTogglePuzzleImage} 
                                    isLocked={!!lockingPuzzleName}
                                    lockingPuzzleName={lockingPuzzleName}
                                  />
                                );
                            })}
                            </div>
                        </div>
                        )}
                        {currentRoom.objects && currentRoom.objects.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                            <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900 py-2 flex items-baseline gap-2">
                                <span>Available Objects</span>
                                <span className="text-xs font-normal text-slate-400">(Toggle to add to inventory)</span>
                            </h2>
                            <div className="space-y-4">
                            {availableObjects.length > 0 ? (
                                availableObjects.map(obj => {
                                    const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                                    return <ObjectItem key={obj.id} obj={obj} onToggle={onToggleObject} lockingPuzzleName={lockingPuzzle?.name} />;
                                })
                            ) : (
                                <p className="text-slate-400">All objects from this room are in the inventory.</p>
                            )}
                            </div>
                        </div>
                        )}
                    </>
                    )}
                </div>
                <div className="col-span-4 bg-slate-900/50 rounded-lg p-6 overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300 sticky top-0 bg-slate-900/50 backdrop-blur-sm py-2">Live Inventory</h2>
                    <div className="space-y-4">
                        {inventoryObjects.length > 0 ? (
                            inventoryObjects.map(obj => {
                                const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                                return (
                                    <ObjectItem
                                        key={obj.id}
                                        obj={obj}
                                        onToggle={onToggleObject}
                                        lockingPuzzleName={lockingPuzzle?.name}
                                        showVisibilityToggle={true}
                                        isDescriptionVisible={visibleDescriptionIds.has(obj.id)}
                                        onToggleDescription={handleToggleDescriptionVisibility}
                                    />
                                );
                            })
                        ) : (
                            <p className="text-slate-400">Inventory is empty. Toggle objects to add them.</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="aspect-[4/3] bg-slate-800 text-white flex flex-col rounded-md overflow-hidden text-xs leading-tight">
        <header className="p-2 bg-slate-900 flex-shrink-0">
          <h1 className="font-bold truncate text-white/80 text-[10px]">Presenter Controls</h1>
        </header>
        <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 overflow-y-auto p-2 space-y-1 border-r border-slate-700">
              <h2 className="font-bold text-slate-400 text-[9px] mb-1">Rooms</h2>
              {presentation.rooms.map((room, index) => {
                  const isLocked = lockingPuzzlesByRoomId.has(room.id);
                  const lockingPuzzleName = lockingPuzzlesByRoomId.get(room.id);
                  return (
                      <div
                          key={room.id}
                          onClick={() => !isLocked && setCurrentRoomIndex(index)}
                          title={isLocked ? `Locked by: ${lockingPuzzleName}` : ''}
                          className={`w-full text-left p-1 rounded-sm flex flex-col items-start ${
                              currentRoomIndex === index
                                  ? 'bg-brand-600 text-white font-bold'
                                  : 'bg-slate-700'
                          } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                          <div className="w-full flex items-center justify-between">
                            <span className="text-[10px] truncate">{room.name}</span>
                            {isLocked && <Icon as="lock" className="w-2 h-2 text-slate-400 flex-shrink-0" />}
                          </div>
                          {isLocked && (
                            <span className="text-[8px] text-red-400/90 truncate">Locked by: {lockingPuzzleName}</span>
                          )}
                      </div>
                  );
              })}
            </div>
            <div className="w-1/3 overflow-y-auto p-2 border-r border-slate-700">
                {currentRoom && (
                  <>
                    <h2 className="font-bold text-slate-400 text-[9px] mb-1">Description</h2>
                    <p className="whitespace-pre-wrap text-slate-300 text-[9px] leading-snug break-words max-h-16 overflow-hidden">
                        {currentRoom.notes || <span className="italic opacity-50">No description.</span>}
                    </p>

                    {currentRoom.puzzles.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <h3 className="font-bold text-slate-400 text-[9px] mb-1">
                          Puzzles <span className="font-normal text-slate-500">(Toggle)</span>
                        </h3>
                        {currentRoom.puzzles.map(puzzle => {
                            // Fix: Corrected typo from `lockingPzzlesByPuzzleId` to `lockingPuzzlesByPuzzleId`.
                            const lockingPuzzleName = lockingPuzzlesByPuzzleId.get(puzzle.id);
                            return (
                                <PuzzleItem 
                                    key={puzzle.id} 
                                    puzzle={puzzle} 
                                    onToggle={onTogglePuzzle} 
                                    onToggleImage={onTogglePuzzleImage} 
                                    isLocked={!!lockingPuzzleName}
                                    lockingPuzzleName={lockingPuzzleName}
                                    variant="mini"
                                />
                            );
                        })}
                      </div>
                    )}

                    {availableObjects.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <h3 className="font-bold text-slate-400 text-[9px] mb-1">
                          Available <span className="font-normal text-slate-500">(Toggle)</span>
                        </h3>
                        {availableObjects.map(obj => {
                            const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                            return (
                                <ObjectItem
                                    key={obj.id} 
                                    obj={obj} 
                                    onToggle={onToggleObject} 
                                    lockingPuzzleName={lockingPuzzle?.name} 
                                    isDescriptionVisible={false}
                                    variant="mini"
                                />
                            );
                        })}
                      </div>
                    )}
                  </>
                )}
            </div>
            <div className="w-1/3 overflow-y-auto p-2">
                <h2 className="font-bold text-slate-400 text-[9px] mb-1">Inventory</h2>
                 {inventoryObjects.length > 0 ? (
                    inventoryObjects.map(obj => {
                        const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                        return (
                            <ObjectItem
                                key={obj.id}
                                obj={obj}
                                onToggle={onToggleObject}
                                lockingPuzzleName={lockingPuzzle?.name}
                                showVisibilityToggle={true}
                                isDescriptionVisible={visibleDescriptionIds.has(obj.id)}
                                onToggleDescription={handleToggleDescriptionVisibility}
                                variant="mini"
                            />
                        );
                    })
                 ) : (
                    <p className="text-slate-500 text-[9px] italic">Empty.</p>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PresenterPreview;