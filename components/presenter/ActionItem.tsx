import React from 'react';
import type { Action } from '../../types';
import Icon from '../Icon';
import MarkdownRenderer from '../MarkdownRenderer';

// This component has been temporarily simplified for debugging purposes.
// All internal hooks (useState, useEffect, useRef) for audio playback have been removed
// to isolate the source of a persistent React rendering error (#310).
// If this resolves the error, the audio functionality can be carefully reintroduced.

const ActionItem: React.FC<{
    action: Action;
    onToggleImage: (id: string, state: boolean) => void;
    onToggleComplete: (id: string, state: boolean) => void;
    isLocked?: boolean;
    lockingPuzzleName?: string;
}> = React.memo(({ action, onToggleImage, onToggleComplete, isLocked = false, lockingPuzzleName }) => {

    if (action.isComplete) {
        // --- RENDER COMPLETED ACTION ---
        return (
            <div className="flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold flex items-center gap-2 text-slate-400 line-through">
                        {action.name}
                    </h3>
                    {!action.hideCompleteButton && (
                        <label className="flex items-center gap-2 text-sm text-yellow-300 cursor-pointer">
                            <span>Re-open</span>
                            <input
                                type="checkbox"
                                checked={true}
                                onChange={(e) => onToggleComplete(action.id, !e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-500"></div>
                        </label>
                    )}
                </div>
                <div className="pl-4 text-slate-500">
                    <MarkdownRenderer content={action.description} />
                </div>
            </div>
        );
    }

    // --- RENDER OPEN ACTION ---
    const isDisabled = !!isLocked;
    return (
        <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg transition-opacity ${isDisabled ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
                <h3 className="font-bold flex items-center gap-2 text-teal-300">
                    {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-400"/>}
                    {action.name}
                </h3>
                <div className="flex items-center gap-4 flex-shrink-0">
                    {action.image && (
                        <label className={`flex items-center gap-2 text-sm text-sky-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <span>Show Image</span>
                            <input
                                type="checkbox"
                                checked={action.showImageOverlay}
                                onChange={(e) => onToggleImage(action.id, e.target.checked)}
                                className="sr-only peer"
                                disabled={isDisabled}
                            />
                            <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 peer-disabled:opacity-50"></div>
                        </label>
                    )}
                    {!action.hideCompleteButton && (
                        <label className={`flex items-center gap-2 text-sm text-green-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <span>Hide</span>
                            <input
                                type="checkbox"
                                checked={false}
                                onChange={(e) => onToggleComplete(action.id, e.target.checked)}
                                className="sr-only peer"
                                disabled={isDisabled}
                            />
                            <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-500"></div>
                        </label>
                    )}
                </div>
            </div>
            <div className="pl-4 text-slate-300">
                <MarkdownRenderer content={action.description} />
                 {lockingPuzzleName && (
                    <p className="text-red-500 text-xs mt-2">Locked by: {lockingPuzzleName}</p>
                )}
            </div>
            {action.sound && (
                <div className="pl-4 mt-2 text-xs text-slate-500 italic">
                    (Audio player temporarily disabled for debugging)
                </div>
            )}
        </div>
    );
});

export default ActionItem;