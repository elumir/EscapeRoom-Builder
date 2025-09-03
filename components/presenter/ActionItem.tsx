import React from 'react';
import type { Action } from '../../types';

const ActionItem: React.FC<{
    action: Action;
    onToggleImage: (id: string, state: boolean) => void;
    variant?: 'full' | 'mini';
}> = ({ action, onToggleImage, variant = 'full' }) => {
    
    if (variant === 'mini') {
        return (
            <div className="mt-1 flex flex-col">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-teal-300/80 text-[9px] truncate">{action.name}</h4>
                </div>
                {action.image && (
                  <div className={`flex items-center gap-1 mt-1`}>
                      <label className={`flex items-center transform scale-75 origin-left cursor-pointer`}>
                          <input
                              type="checkbox"
                              checked={action.showImageOverlay}
                              onChange={(e) => onToggleImage(action.id, e.target.checked)}
                              className="sr-only peer"
                          />
                          <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                      </label>
                      <span className="text-slate-400 text-[9px]">Show Image</span>
                  </div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg`}>
            <div className="flex items-start justify-between">
                <h3 className="font-bold text-teal-300">{action.name}</h3>
                {action.image && (
                    <label className={`flex items-center gap-2 text-sm text-sky-300 cursor-pointer`}>
                        <span>Show Image</span>
                        <input
                            type="checkbox"
                            checked={action.showImageOverlay}
                            onChange={(e) => onToggleImage(action.id, e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                )}
            </div>
            <div className="text-slate-300 whitespace-pre-wrap">
                {action.description}
            </div>
        </div>
    );
};

export default ActionItem;
