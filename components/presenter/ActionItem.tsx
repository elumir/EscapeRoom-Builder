import React, { useState, useRef, useEffect } from 'react';
import type { Action } from '../../types';

const ActionItem: React.FC<{
    action: Action;
    onToggleImage: (id: string, state: boolean) => void;
    onToggleComplete: (id: string, state: boolean) => void;
    variant?: 'full' | 'mini';
}> = ({ action, onToggleImage, onToggleComplete, variant = 'full' }) => {
    
    const isComplete = action.isComplete ?? false;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!action.sound) {
            return;
        }

        const audio = new Audio(`/api/assets/${action.sound}`);
        audioRef.current = audio;

        const handleAudioEnd = () => setIsPlaying(false);
        audio.addEventListener('ended', handleAudioEnd);

        return () => {
            audio.pause();
            audio.removeEventListener('ended', handleAudioEnd);
            audioRef.current = null;
            setIsPlaying(false);
        }
    }, [action.sound]);

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            } else {
                audioRef.current.play().catch(err => console.error("Error playing sound:", err));
            }
            setIsPlaying(!isPlaying);
        }
    };

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
                <div className="flex items-center gap-3 flex-grow min-w-0">
                    {action.sound && (
                        <button
                            onClick={handlePlayPause}
                            title={isPlaying ? "Stop Sound" : "Play Sound"}
                            disabled={isComplete}
                            className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPlaying ? (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 5h10v10H5V5z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                            )}
                        </button>
                    )}
                    <h3 className={`font-bold truncate ${isComplete ? 'text-slate-400 line-through' : 'text-teal-300'}`}>{action.name}</h3>
                </div>

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
            <div className={`pl-4 ${isComplete ? 'text-slate-500' : 'text-slate-300'} whitespace-pre-wrap`}>
                {action.description}
            </div>
        </div>
    );
};

export default ActionItem;