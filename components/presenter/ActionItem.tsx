import React, { useState, useRef, useEffect } from 'react';
import type { Action } from '../../types';
import Icon from '../Icon';
import { API_BASE_URL } from '../../services/presentationService';

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) {
        return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

const ActionItem: React.FC<{
    action: Action;
    onToggleImage: (id: string, state: boolean) => void;
    onToggleComplete: (id: string, state: boolean) => void;
    isLocked?: boolean;
    lockingPuzzleName?: string;
    variant?: 'full' | 'mini';
}> = ({ action, onToggleImage, onToggleComplete, isLocked, lockingPuzzleName, variant = 'full' }) => {
    
    const isComplete = action.isComplete ?? false;
    const isDisabled = isComplete || isLocked;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!action.sound) {
            return;
        }

        const audio = new Audio(`${API_BASE_URL}/assets/${action.sound}`);
        audioRef.current = audio;

        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setProgress(audio.currentTime);
        const handleAudioEnd = () => setIsPlaying(false);

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleAudioEnd);

        return () => {
            audio.pause();
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleAudioEnd);
            audioRef.current = null;
            setIsPlaying(false);
            setProgress(0);
        }
    }, [action.sound]);
    
    useEffect(() => {
        if (isDisabled && audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [isDisabled, isPlaying]);

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(err => console.error("Error playing sound:", err));
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleRewind = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = Number(e.target.value);
            audioRef.current.currentTime = newTime;
            setProgress(newTime);
        }
    }

    if (variant === 'mini') {
        return (
            <div className={`mt-1 flex flex-col ${isDisabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-1">
                     <h4 className={`font-bold text-[9px] truncate flex-grow flex items-center gap-1 ${isComplete ? 'text-slate-500 line-through' : 'text-teal-300/80'}`}>
                        {isLocked && <Icon as="lock" className="w-2 h-2 text-slate-400"/>}
                        {action.name}
                     </h4>
                     {!action.hideCompleteButton && (
                        <label className={`flex items-center transform scale-75 origin-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={isComplete}
                                onChange={(e) => onToggleComplete(action.id, e.target.checked)}
                                className="sr-only peer"
                                disabled={isLocked}
                            />
                            <div className="relative w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                     )}
                </div>
                {lockingPuzzleName && (
                    <p className="text-red-500/80 text-[8px] leading-tight truncate mt-0.5">Locked by: {lockingPuzzleName}</p>
                )}
                {action.image && (
                  <div className={`flex items-center gap-1 mt-1`}>
                      <label className={`flex items-center transform scale-75 origin-left ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                              type="checkbox"
                              checked={action.showImageOverlay}
                              onChange={(e) => onToggleImage(action.id, e.target.checked)}
                              className="sr-only peer"
                              disabled={isDisabled}
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
        <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg transition-opacity ${isDisabled ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
                <h3 className={`font-bold flex items-center gap-2 ${isComplete ? 'text-slate-400 line-through' : 'text-teal-300'}`}>
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
                            <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 
                            peer-disabled:opacity-50
                            "></div>
                        </label>
                    )}

                    {!action.hideCompleteButton && (
                        <label className={`flex items-center gap-2 text-sm ${isComplete ? 'text-slate-400' : 'text-green-300'} ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <span>Complete</span>
                            <input
                                type="checkbox"
                                checked={isComplete}
                                onChange={(e) => onToggleComplete(action.id, e.target.checked)}
                                className="sr-only peer"
                                disabled={isLocked}
                            />
                            <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    )}
                </div>
            </div>
            <div className={`pl-4 ${isComplete ? 'text-slate-500' : 'text-slate-300'} whitespace-pre-wrap`}>
                {action.description}
                 {lockingPuzzleName && (
                    <p className="text-red-500 text-xs mt-2">Locked by: {lockingPuzzleName}</p>
                )}
            </div>
            {action.sound && (
                <div className="pl-4 mt-2">
                    <div className={`flex items-center gap-3 w-full bg-slate-700/50 p-2 rounded-lg transition-opacity ${isDisabled ? 'opacity-60' : ''}`}>
                        <button onClick={handlePlayPause} disabled={isDisabled} title={isPlaying ? "Pause" : "Play"} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:cursor-not-allowed disabled:hover:bg-slate-700">
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 3.5A1.5 1.5 0 017 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM12.5 3.5A1.5 1.5 0 0114 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                            )}
                        </button>
                        <button onClick={handleRewind} disabled={isDisabled} title="Rewind to Start" className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:cursor-not-allowed disabled:hover:bg-slate-700">
                           <Icon as="rewind" className="h-5 w-5" />
                        </button>
                        <div className="flex-grow flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono">{formatTime(progress)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={progress}
                                onChange={handleScrub}
                                disabled={isDisabled}
                                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                             <span className="text-xs text-slate-400 font-mono">{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionItem;