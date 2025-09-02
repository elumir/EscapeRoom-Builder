import React from 'react';
import type { InventoryObject } from '../../types';
import Icon from '../Icon';

const ObjectItem: React.FC<{
    obj: InventoryObject;
    onToggle: (id: string, state: boolean) => void;
    lockingPuzzleName?: string;
    showVisibilityToggle?: boolean;
    isDescriptionVisible?: boolean;
    onToggleDescription?: (id: string) => void;
    variant?: 'full' | 'mini';
}> = ({ 
    obj, 
    onToggle, 
    lockingPuzzleName, 
    showVisibilityToggle = false, 
    isDescriptionVisible = true, 
    onToggleDescription,
    variant = 'full'
}) => {
    const isLocked = !!lockingPuzzleName;

    if (variant === 'mini') {
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
                        {showVisibilityToggle && onToggleDescription && (
                            <button onClick={() => onToggleDescription(obj.id)} className="text-slate-500 hover:text-white flex-shrink-0">
                               <Icon as={isDescriptionVisible ? 'eye-slash' : 'eye'} className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {isDescriptionVisible && (
                        <p className="text-slate-400 text-[8px] leading-tight break-words line-clamp-2">{obj.description}</p>
                    )}
                    {lockingPuzzleName && (
                        <p className="text-red-500/80 text-[8px] leading-tight truncate mt-0.5">Locked by: {lockingPuzzleName}</p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`flex items-start gap-4 transition-opacity ${isLocked ? 'opacity-50' : ''}`}>
            <label className={`flex items-center mt-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                    type="checkbox"
                    checked={obj.showInInventory}
                    onChange={(e) => onToggle(obj.id, e.target.checked)}
                    className="sr-only peer"
                    disabled={isLocked}
                />
                <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
            </label>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-brand-400">{obj.name}</h3>
                    {showVisibilityToggle && onToggleDescription && (
                        <button onClick={() => onToggleDescription(obj.id)} className="text-slate-400 hover:text-white">
                            <Icon as={isDescriptionVisible ? 'eye-slash' : 'eye'} className="w-5 h-5" />
                        </button>
                    )}
                </div>
                {isDescriptionVisible && (
                    <p className="text-slate-300 mt-1">{obj.description}</p>
                )}
                {lockingPuzzleName && (
                    <p className="text-red-500 text-xs mt-1">Locked by: {lockingPuzzleName}</p>
                )}
            </div>
        </div>
    );
}

export default ObjectItem;