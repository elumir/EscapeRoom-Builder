import React, { useState, useEffect } from 'react';
import type { Game, Puzzle } from '../types';
import Icon from './Icon';
import ObjectItem from './presenter/ObjectItem';
import PuzzleItem from './presenter/PuzzleItem';
import ActionItem from './presenter/ActionItem';
import { usePresenterState } from '../hooks/usePresenterState';
import MarkdownRenderer from './MarkdownRenderer';

interface PresenterPreviewProps {
  game: Game;
  currentRoomIndex: number;
  onToggleObject: (objectId: string, newState: boolean) => void;
  onTogglePuzzle: (puzzleId: string, newState: boolean) => void;
  onTogglePuzzleImage: (puzzleId: string, newState: boolean) => void;
  onToggleActionImage: (actionId: string, newState: boolean) => void;
  isExpanded: boolean;
  onClose?: () => void;
}

const PresenterPreview: React.FC<PresenterPreviewProps> = ({ game, currentRoomIndex: initialRoomIndex, onToggleObject, onTogglePuzzle, onTogglePuzzleImage, onToggleActionImage, isExpanded, onClose }) => {
  const [currentRoomIndex, setCurrentRoomIndex] = useState(initialRoomIndex);
  const [visibleDescriptionIds, setVisibleDescriptionIds] = useState<Set<string>>(new Set());
  const [puzzleToSolve, setPuzzleToSolve] = useState<Puzzle | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [solveError, setSolveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'inventory'>('rooms');

  useEffect(() => {
    setCurrentRoomIndex(initialRoomIndex);
  }, [initialRoomIndex])

  const {
      allUnsolvedPuzzles,
      lockingPuzzlesByRoomId,
      lockingPuzzlesByPuzzleId,
      inventoryObjects,
  } = usePresenterState(game);


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

  const handleAttemptSolve = (puzzleId: string) => {
    if (!game) return;
    for (const room of game.rooms) {
        const puzzle = room.puzzles.find(p => p.id === puzzleId);
        if (puzzle) {
            setPuzzleToSolve(puzzle);
            setSubmittedAnswer('');
            setSolveError(null);
            break;
        }
    }
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puzzleToSolve) return;

    // Input is already sanitized by the onChange handler
    if (submittedAnswer === puzzleToSolve.answer) {
        onTogglePuzzle(puzzleToSolve.id, true);
        setPuzzleToSolve(null);
    } else {
        setSolveError('Incorrect answer. Please try again.');
        setSubmittedAnswer('');
    }
  };


  const currentRoom = game.rooms[currentRoomIndex];
  const availableObjects = currentRoom?.objects.filter(o => !o.showInInventory) || [];
  
  const AnswerModal = () => (
    puzzleToSolve && (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-slate-700">
              <h2 className="text-xl font-bold mb-4 text-amber-400">Solving: {puzzleToSolve.name}</h2>
              {puzzleToSolve.unsolvedText && (
                  <blockquote className="mb-6 p-4 bg-slate-700/50 border-l-4 border-slate-600 text-slate-300 italic">
                      {puzzleToSolve.unsolvedText}
                  </blockquote>
              )}
              <p className="text-slate-400 mb-6">Enter the answer provided by the players.</p>
              <form onSubmit={handleSubmitAnswer}>
                  <input
                      type="text"
                      value={submittedAnswer}
                      onChange={e => {
                          setSubmittedAnswer(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                          if (solveError) setSolveError(null);
                      }}
                      className="w-full px-4 py-2 font-mono tracking-widest text-lg border border-slate-600 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                  />
                  {solveError && (
                      <p className="text-red-400 text-sm mt-2">{solveError}</p>
                  )}
                  <div className="mt-6 flex justify-end gap-4">
                      <button type="button" onClick={() => setPuzzleToSolve(null)} className="px-4 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">Submit</button>
                  </div>
              </form>
          </div>
      </div>
    )
  );

  if (isExpanded) {
    return (
        <div className="h-full bg-slate-800 text-white flex flex-col rounded-lg">
            <AnswerModal />
            <header className="p-4 bg-slate-900 flex justify-between items-center flex-shrink-0 rounded-t-lg">
                <h1 className="text-xl font-bold">{game.title} - Presenter Preview</h1>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <Icon as="close" />
                    </button>
                )}
            </header>
            <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
                <div className="col-span-3 flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 mb-4 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('rooms')}
                                className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                                    activeTab === 'rooms' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                                }`}
                                aria-pressed={activeTab === 'rooms'}
                            >
                                Rooms
                            </button>
                            <button
                                onClick={() => setActiveTab('inventory')}
                                className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                                    activeTab === 'inventory' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                                }`}
                                aria-pressed={activeTab === 'inventory'}
                            >
                                Live Inventory
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {activeTab === 'rooms' && (
                            <div className="space-y-2">
                                {game.rooms.map((room, index) => {
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
                        )}
                        {activeTab === 'inventory' && (
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
                        )}
                    </div>
                </div>
                <div className="col-span-9 bg-slate-900 rounded-lg p-6 overflow-y-auto flex flex-col">
                    {currentRoom && (
                    <>
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold mb-4 text-slate-300">Room Description</h2>
                            <div className="prose prose-invert prose-lg max-w-none text-slate-200">
                                {currentRoom.notes ? (
                                    <MarkdownRenderer content={currentRoom.notes} />
                                 ) : (
                                    <span className="text-slate-400 italic">No description for this room.</span>
                                 )}
                            </div>
                        </div>
                        {currentRoom.actions && currentRoom.actions.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                            <h2 className="text-lg font-semibold mb-4 text-slate-300">
                              Actions
                            </h2>
                            <div className="space-y-4">
                              {(currentRoom.actions || []).map(action => (
                                <ActionItem 
                                  key={action.id} 
                                  action={action} 
                                  onToggleImage={onToggleActionImage}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {currentRoom.puzzles && currentRoom.puzzles.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-700 flex-shrink-0">
                            <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-baseline gap-2">
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
                                    onAttemptSolve={handleAttemptSolve}
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
                            <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-baseline gap-2">
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
            </main>
        </div>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
      <AnswerModal />
      <div className="aspect-[4/3] bg-slate-800 text-white flex flex-col rounded-md overflow-hidden text-xs leading-tight">
        <header className="p-2 bg-slate-900 flex-shrink-0">
          <h1 className="font-bold truncate text-white/80 text-[10px]">Presenter Controls</h1>
        </header>
        <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 flex flex-col border-r border-slate-700">
                <div className="flex-shrink-0 p-1 border-b border-slate-700 flex items-stretch">
                    <button 
                        onClick={() => setActiveTab('rooms')} 
                        className={`flex-1 text-center text-[9px] font-bold p-1 rounded-sm transition-colors ${activeTab === 'rooms' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:bg-slate-600'}`}
                        aria-pressed={activeTab === 'rooms'}
                    >
                        Rooms
                    </button>
                    <button 
                        onClick={() => setActiveTab('inventory')} 
                        className={`flex-1 text-center text-[9px] font-bold p-1 rounded-sm transition-colors ${activeTab === 'inventory' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:bg-slate-600'}`}
                        aria-pressed={activeTab === 'inventory'}
                    >
                        Inventory
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-2">
                    {activeTab === 'rooms' && (
                        <div className="space-y-1">
                          {game.rooms.map((room, index) => {
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
                    )}
                    {activeTab === 'inventory' && (
                        <div>
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
                    )}
                </div>
            </div>
            <div className="w-2/3 overflow-y-auto p-2">
                {currentRoom && (
                  <>
                    <h2 className="font-bold text-slate-400 text-[9px] mb-1">Description</h2>
                    <div className="text-slate-300 text-[9px] leading-snug break-words max-h-16 overflow-y-auto">
                        {currentRoom.notes ? (
                            <MarkdownRenderer content={currentRoom.notes} />
                        ) : (
                            <span className="italic opacity-50">No description.</span>
                        )}
                    </div>

                    {currentRoom.actions && currentRoom.actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <h3 className="font-bold text-slate-400 text-[9px] mb-1">
                          Actions
                        </h3>
                        {currentRoom.actions.map(action => (
                           <ActionItem 
                              key={action.id} 
                              action={action} 
                              onToggleImage={onToggleActionImage} 
                              variant="mini"
                           />
                        ))}
                      </div>
                    )}

                    {currentRoom.puzzles.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <h3 className="font-bold text-slate-400 text-[9px] mb-1">
                          Puzzles <span className="font-normal text-slate-500">(Toggle)</span>
                        </h3>
                        {currentRoom.puzzles.map(puzzle => {
                            const lockingPuzzleName = lockingPuzzlesByPuzzleId.get(puzzle.id);
                            return (
                                <PuzzleItem 
                                    key={puzzle.id} 
                                    puzzle={puzzle} 
                                    onToggle={onTogglePuzzle} 
                                    onAttemptSolve={handleAttemptSolve}
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
        </div>
      </div>
    </div>
  );
};

export default PresenterPreview;