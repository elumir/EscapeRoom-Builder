
import React, { useState } from 'react';
import type { Presentation, InventoryObject, Puzzle } from '../types';
import Icon from './Icon';
import ObjectItem from './presenter/ObjectItem';
import PuzzleItem from './presenter/PuzzleItem';

interface PresenterPreviewProps {
  presentation: Presentation;
  currentRoomIndex: number;
  onToggleObject: (objectId: string, newState: boolean) => void;
  onTogglePuzzle: (puzzleId: string, newState: boolean) => void;
  onTogglePuzzleImage: (puzzleId: string, newState: boolean) => void;
  isExpanded: boolean;
  onClose?: () => void;
}

const MiniObjectItem: React.FC<{
    obj: InventoryObject;
    onToggle: (id: string, state: boolean) => void;
    lockingPuzzleName?: string;
    isInventoryItem?: boolean;
    isDescriptionVisible?: boolean;
    onToggleDescription?: (id: string) => void;
}> = ({ obj, onToggle, lockingPuzzleName, isInventoryItem = false, isDescriptionVisible, onToggleDescription }) => {
    const isLocked = !!lockingPuzzleName;
    return (
        <div className={`mt-1 flex items-start gap-1 ${isLocked ? 'opacity-50' : ''}`}>
            <label className={`flex items-center transform scale-75 origin-left ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                    type="checkbox"
                    checked={obj.showInInventory}
                    onChange={(e) => onToggle(obj.id, e.target.checked)}
                    className="sr-only peer"
                    disabled={isLocked}
                />
                <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-brand-400/80 text-[9px] truncate">{obj.name}</h4>
                    {isInventoryItem && onToggleDescription && (
                        <button onClick={() => onToggleDescription(obj.id)} className="text-slate-500 hover:text-white flex-shrink-0">
                           <Icon as={isDescriptionVisible ? 'eye-slash' : 'eye'} className="w-3 h-3" />
                        </button>
                    )}
                </div>
                {isDescriptionVisible && (
                    <p className="text-slate-400 text-[8px] leading-tight break-words truncate">{obj.description}</p>
                )}
                {lockingPuzzleName && (
                    <p className="text-red-500/80 text-[8px] leading-tight truncate mt-0.5">Locked by: {lockingPuzzleName}</p>
                )}
            </div>
        </div>
    );
};

const MiniPuzzleItem: React.FC<{
    puzzle: Puzzle;
    onToggle: (id: string, state: boolean) => void;
    onToggleImage: (id: string, state: boolean) => void;
    isLocked?: boolean;
    lockingPuzzleName?: string;
}> = ({ puzzle, onToggle, onToggleImage, isLocked, lockingPuzzleName }) => (
    <div className={`mt-1 flex flex-col ${isLocked ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-1">
        <label className={`flex items-center transform scale-75 origin-left ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
                type="checkbox"
                checked={puzzle.isSolved}
                onChange={(e) => onToggle(puzzle.id, e.target.checked)}
                className="sr-only peer"
                disabled={isLocked}
            />
            <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
        </label>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-amber-400/80 text-[9px] truncate flex items-center gap-1">
                {isLocked && <Icon as="lock" className="w-2 h-2 text-slate-400"/>}
                {puzzle.name}
            </h4>
        </div>
      </div>
       {lockingPuzzleName && (
           <p className="text-red-500/80 text-[8px] leading-tight truncate mt-0.5 pl-1">Locked by: {lockingPuzzleName}</p>
       )}
       {puzzle.image && (
          <div className={`flex items-center gap-1 pl-1 mt-1 ${isLocked ? 'opacity-50' : ''}`}>
              <label className={`flex items-center transform scale-75 origin-left ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                      type="checkbox"
                      checked={puzzle.showImageOverlay}
                      onChange={(e) => onToggleImage(puzzle.id, e.target.checked)}
                      className="sr-only peer"
                      disabled={isLocked}
                  />
                  <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
              <span className="text-slate-400 text-[9px]">Show Image</span>
          </div>
        )}
    </div>
);

const PresenterPreview: React.FC<PresenterPreviewProps> = ({ presentation, currentRoomIndex: initialRoomIndex, onToggleObject, onTogglePuzzle, onTogglePuzzleImage, isExpanded, onClose }) => {
  const [currentRoomIndex, setCurrentRoomIndex] = useState(initialRoomIndex);
  const [visibleDescriptionIds, setVisibleDescriptionIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    setCurrentRoomIndex(initialRoomIndex);
  }, [initialRoomIndex])

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

  const allUnsolvedPuzzles = presentation.rooms.flatMap(r => r.puzzles).filter(p => !p.isSolved);

  const lockingPuzzlesByRoomId = new Map<string, string>();
  const lockingPuzzlesByPuzzleId = new Map<string, string>();

  allUnsolvedPuzzles.forEach(puzzle => {
      (puzzle.lockedRoomIds || []).forEach(roomId => {
          if (!lockingPuzzlesByRoomId.has(roomId)) {
              lockingPuzzlesByRoomId.set(roomId, puzzle.name);
          }
      });
      (puzzle.lockedPuzzleIds || []).forEach(puzzleId => {
          if (!lockingPuzzlesByPuzzleId.has(puzzleId)) {
              lockingPuzzlesByPuzzleId.set(puzzleId, puzzle.name);
          }
      });
  });

  const currentRoom = presentation.rooms[currentRoomIndex];
  const inventoryObjects = presentation.rooms.flatMap(r => r.objects).filter(o => o.showInInventory);
  const availableObjects = currentRoom?.objects.filter(o => !o.showInInventory) || [];
  
  if (isExpanded) {
    return (
        <div className="h-full bg-slate-800 text-white flex flex-col rounded-lg">
            <header className="p-4 bg-slate-900 flex justify-between items-center flex-shrink-0 rounded-t-lg">
                <h1 className="text-xl font-bold">{presentation.title} - Presenter Preview</h1>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <Icon as="close" />
                </button>
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
                          Puzzles <span className="font-normal text-slate-500">(Toggle to solve)</span>
                        </h3>
                        {currentRoom.puzzles.map(puzzle => {
                            const lockingPuzzleName = lockingPuzzlesByPuzzleId.get(puzzle.id);
                            return (
                                <MiniPuzzleItem 
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
                    )}

                    {availableObjects.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <h3 className="font-bold text-slate-400 text-[9px] mb-1">
                          Available <span className="font-normal text-slate-500">(Toggle to add)</span>
                        </h3>
                        {availableObjects.map(obj => {
                            const lockingPuzzle = allUnsolvedPuzzles.find(p => p.lockedObjectIds?.includes(obj.id));
                            return (
                                <MiniObjectItem 
                                    key={obj.id} 
                                    obj={obj} 
                                    onToggle={onToggleObject} 
                                    lockingPuzzleName={lockingPuzzle?.name} 
                                    isDescriptionVisible={true}
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
                            <MiniObjectItem
                                key={obj.id}
                                obj={obj}
                                onToggle={onToggleObject}
                                lockingPuzzleName={lockingPuzzle?.name}
                                isInventoryItem={true}
                                isDescriptionVisible={visibleDescriptionIds.has(obj.id)}
                                onToggleDescription={handleToggleDescriptionVisibility}
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
