import React from 'react';
import type { Action } from '../../types';

const ActionItem: React.FC<{
    action: Action;
    onToggleImage: (id: string, state: boolean) => void;
    onToggleComplete: (id: string, state: boolean) => void;
    variant?: 'full' | 'mini';
}> = ({ action, onToggleImage, onToggleComplete, variant = 'full' }) => {
    
    const isComplete = action.isComplete ?? false;

    if (variant === 'mini') {
        return (
            <div className={`mt-1 flex flex-col ${isComplete ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-1">
                     <h4 className={`font-bold text-[9px] truncate flex-grow ${isComplete ? 'text-slate-500 line-through' : 'text-teal-300/80'}`}>{action.name}</h4>
                     <label className={`flex items-center transform scale-75 origin-center cursor-pointer`}>
                        <input
                            type="checkbox"
                            checked={isComplete}
                            onChange={(e) => onToggleComplete(action.id, e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>
                {action.image && (
                  <div className={`flex items-center gap-1 mt-1`}>
                      <label className={`flex items-center transform scale-75 origin-left cursor-pointer`}>
                          <input
                              type="checkbox"
                              checked={action.showImageOverlay}
                              onChange={(e) => onToggleImage(action.id, e.target.checked)}
                              className="sr-only peer"
                              disabled={isComplete}
                          />
                          <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600 peer-disabled:opacity-50"></div>
                      </label>
                      <span className="text-slate-400 text-[9px]">Show Image</span>
                  </div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg transition-opacity ${isComplete ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
                <h3 className={`font-bold flex-grow ${isComplete ? 'text-slate-400 line-through' : 'text-teal-300'}`}>{action.name}</h3>
                
                <div className="flex items-center gap-4 flex-shrink-0">
                    {action.image && (
                        <label className={`flex items-center gap-2 text-sm text-sky-300 cursor-pointer`}>
                            <span>Show Image</span>
                            <input
                                type="checkbox"
                                checked={action.showImageOverlay}
                                onChange={(e) => onToggleImage(action.id, e.target.checked)}
                                className="sr-only peer"
                                disabled={isComplete}
                            />
                            <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 peer-disabled:opacity-50"></div>
                        </label>
                    )}

                    <label className={`flex items-center gap-2 text-sm ${isComplete ? 'text-slate-400' : 'text-green-300'} cursor-pointer`}>
                        <span>Complete</span>
                        <input
                            type="checkbox"
                            checked={isComplete}
                            onChange={(e) => onToggleComplete(action.id, e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>
            </div>
            <div className={` ${isComplete ? 'text-slate-500' : 'text-slate-300'} whitespace-pre-wrap`}>
                {action.description}
            </div>
        </div>
    );
};

export default ActionItem;