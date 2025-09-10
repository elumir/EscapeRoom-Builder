import React from 'react';
import type { Puzzle } from '../../types';
import Icon from '../Icon';
import MarkdownRenderer from '../MarkdownRenderer';

// This component has been temporarily simplified for debugging purposes.
// All internal hooks (useState, useEffect) for audio playback and visual effects
// have been removed to isolate the source of a persistent React rendering error (#310).
// If this resolves the error, the functionality can be carefully reintroduced.

const CheckmarkIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const PuzzleItem: React.FC<{
    puzzle: Puzzle;
    onToggle: (id: string, state: boolean) => void;
    onToggleImage: (id: string, state: boolean) => void;
    onAttemptSolve: (id: string) => void;
    isLocked?: boolean;
    lockingPuzzleName?: string;
    variant?: 'full' | 'mini';
}> = React.memo(({
    puzzle,
    onToggle,
    onToggleImage,
    onAttemptSolve,
    isLocked = false,
    lockingPuzzleName,
    variant = 'full',
}) => {
    
    const handleCompleteClick = () => {
        if (isLocked) return;
        if (puzzle.answer) onAttemptSolve(puzzle.id);
        else onToggle(puzzle.id, true);
    };


    // --- RENDER LOGIC ---

    if (puzzle.isSolved) {
        // --- RENDER SOLVED PUZZLE ---
        if (variant === 'mini') {
            return (
                <div className={`mt-1 flex items-center gap-1 p-1 rounded-sm border border-transparent`}>
                    <div className="text-green-400 flex-shrink-0"><CheckmarkIcon className="h-3 w-3" /></div>
                    <h4 className="font-semibold text-slate-500 text-[9px] truncate line-through">{puzzle.name}</h4>
                </div>
            );
        }

        return (
            <div className={`flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border-2 border-transparent`}>
                <div className="text-green-400 mt-1 flex-shrink-0"><CheckmarkIcon className="h-6 w-6" /></div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-400 line-through">{puzzle.name}</h3>
                    <div className="text-slate-300 mt-2">
                        <MarkdownRenderer content={puzzle.solvedText} />
                    </div>
                </div>
            </div>
        );

    } else {
        // --- RENDER UNSOLVED PUZZLE ---
        if (variant === 'mini') {
            return (
                <div className={`mt-1 flex flex-col ${isLocked ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between gap-1">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-amber-400/80 text-[9px] truncate flex items-center gap-1">
                                {isLocked && <Icon as="lock" className="w-2 h-2 text-slate-400"/>}
                                {puzzle.name}
                            </h4>
                        </div>
                         <button
                            onClick={handleCompleteClick}
                            disabled={isLocked}
                            className="px-1.5 py-0.5 bg-green-700 text-white rounded text-[9px] hover:bg-green-600 disabled:bg-slate-600 flex-shrink-0"
                        >
                            {puzzle.answer ? 'Solve' : 'Complete'}
                        </button>
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
                          <span className="text-slate-400 text-[9px]">Show Puzzle</span>
                      </div>
                    )}
                </div>
            );
        }

        return (
            <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg transition-opacity ${isLocked ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-amber-400 flex items-center gap-2">
                            {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-400"/>}
                            {puzzle.name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {puzzle.image && (
                            <label className={`flex items-center gap-2 text-sm text-sky-300 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <span>Show Puzzle</span>
                                <input
                                    type="checkbox"
                                    checked={puzzle.showImageOverlay}
                                    onChange={(e) => onToggleImage(puzzle.id, e.target.checked)}
                                    className="sr-only peer"
                                    disabled={isLocked}
                                />
                                <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                            </label>
                        )}
                        <button
                            onClick={handleCompleteClick}
                            disabled={isLocked}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                            {puzzle.answer ? 'Solve' : 'Complete'}
                        </button>
                    </div>
                </div>
                <div className="pl-4 text-slate-300">
                    <MarkdownRenderer content={puzzle.unsolvedText} />
                     {lockingPuzzleName && (
                        <p className="text-red-500 text-xs mt-2">Locked by: {lockingPuzzleName}</p>
                    )}
                </div>
                {puzzle.sound && (
                     <div className="pl-4 mt-2 text-xs text-slate-500 italic">
                        (Audio player temporarily disabled for debugging)
                    </div>
                )}
            </div>
        );
    }
});

export default PuzzleItem;