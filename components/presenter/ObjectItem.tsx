import React from 'react';
import type { InventoryObject } from '../../types';
import Icon from '../Icon';

const migrateObjectColorClass = (nameColor?: string | null): string => {
    const defaultClass = 'bg-slate-700';
    if (!nameColor) return defaultClass;
    if (nameColor.startsWith('bg-')) return nameColor;

    // Map old text colors to new background colors for backward compatibility.
    const colorMap: Record<string, string> = {
        'text-green-500': 'bg-green-500 text-white',
        'text-green-400': 'bg-green-500 text-white',
        'text-yellow-500': 'bg-amber-500 text-white',
        'text-yellow-400': 'bg-amber-500 text-white',
        'text-blue-500': 'bg-blue-500 text-white',
        'text-blue-400': 'bg-blue-500 text-white',
        'text-red-500': 'bg-red-500 text-white',
        'text-red-400': 'bg-red-500 text-white',
        'text-cyan-500': 'bg-cyan-500 text-white',
        'text-cyan-400': 'bg-cyan-500 text-white',
        'text-pink-500': 'bg-pink-500 text-white',
        'text-pink-400': 'bg-pink-500 text-white',
        'text-gray-200': 'bg-gray-200 text-gray-800 dark:bg-gray-300 dark:text-gray-900',
        'text-gray-400': 'bg-gray-200 text-gray-800 dark:bg-gray-300 dark:text-gray-900',
    };
    return colorMap[nameColor] || defaultClass;
};

const ObjectItem: React.FC<{
    obj: InventoryObject;
    onToggle: (id: string, state: boolean) => void;
    lockingPuzzleName?: string;
    showVisibilityToggle?: boolean;
    isDescriptionVisible?: boolean;
    onToggleDescription?: (id: string) => void;
    onToggleImage?: (id: string, state: boolean) => void;
    onToggleInRoomImage?: (id: string, state: boolean) => void;
    variant?: 'full' | 'mini';
}> = React.memo(({ 
    obj, 
    onToggle, 
    lockingPuzzleName, 
    showVisibilityToggle = false,
    isDescriptionVisible = false,
    onToggleDescription,
    onToggleImage,
    onToggleInRoomImage,
    variant = 'full',
}) => {
    const colorClass = migrateObjectColorClass(obj.nameColor);
    const textColorClass = colorClass.includes('text-') ? '' : 'text-white';
    const isLocked = !!lockingPuzzleName;
    const isPresenterVisible = !(obj.isPresenterHidden ?? false);

    if (variant === 'mini') {
        return (
            <div className={`p-2 rounded-md ${colorClass} ${textColorClass} ${isLocked ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-1">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate flex items-center gap-1">
                            {isLocked && <Icon as="lock" className="w-3 h-3 text-current flex-shrink-0"/>}
                            {obj.name}
                        </h4>
                    </div>
                    <div className="flex items-center gap-1">
                        {onToggleInRoomImage && obj.inRoomImage && (
                            <button
                                onClick={() => onToggleInRoomImage(obj.id, !isPresenterVisible)}
                                disabled={isLocked}
                                className={`p-1 rounded-full transition-colors ${
                                    isPresenterVisible 
                                        ? 'bg-sky-500 text-white hover:bg-sky-600' 
                                        : 'bg-white/20 text-white hover:bg-white/40'
                                } disabled:bg-white/10 disabled:cursor-not-allowed flex-shrink-0`}
                                title={isPresenterVisible ? "Hide in-room image" : "Show in-room image"}
                            >
                                <Icon as={isPresenterVisible ? 'eye' : 'eye-slash'} className="w-3 h-3"/>
                            </button>
                        )}
                        {(obj.isPickupable ?? true) && (
                            <button
                                onClick={() => onToggle(obj.id, true)}
                                disabled={isLocked}
                                className="p-1 bg-white/20 text-white rounded-full hover:bg-white/40 disabled:bg-white/10 disabled:cursor-not-allowed flex-shrink-0"
                                title={lockingPuzzleName ? `Locked by: ${lockingPuzzleName}` : "Add to inventory"}
                            >
                                <Icon as="hand-expand" className="w-3 h-3"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-lg ${colorClass} ${textColorClass} ${isLocked ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base">{obj.name}</h4>
                     {isLocked && (
                        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <Icon as="lock" className="w-3 h-3"/>
                            Locked by: {lockingPuzzleName}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {onToggleDescription && (
                        <button
                            onClick={() => onToggleDescription(obj.id)}
                            className="p-1 text-current hover:bg-white/20 rounded-full"
                            title={isDescriptionVisible ? "Hide description" : "Show description"}
                        >
                            <Icon as={isDescriptionVisible ? "description-slash" : "description"} className="w-4 h-4" />
                        </button>
                    )}
                    {showVisibilityToggle && (
                        <button
                            onClick={() => onToggle(obj.id, false)}
                            disabled={isLocked}
                            className="p-1 text-current hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove from inventory"
                        >
                            <Icon as="move-right" className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            {isDescriptionVisible && obj.description && (
                <div className="mt-2 pt-2 border-t border-white/20 text-sm whitespace-pre-wrap">
                    {obj.description}
                </div>
            )}
            {onToggleImage && obj.image && (
                <div className="mt-2 pt-2 border-t border-white/20">
                     <label className={`flex items-center gap-2 text-sm text-current ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>Show Image Overlay</span>
                        <input
                            type="checkbox"
                            checked={obj.showImageOverlay}
                            onChange={(e) => onToggleImage(obj.id, e.target.checked)}
                            className="sr-only peer"
                            disabled={isLocked}
                        />
                        <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                </div>
            )}
        </div>
    );
});

export default ObjectItem;