
import React, { useState, useRef, useEffect } from 'react';
import type { Puzzle } from '../../types';
import Icon from '../Icon';

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

const PuzzleItem: React.FC<{
    puzzle: Puzzle;
    onToggle: (id: string, state: boolean) => void;
    onToggleImage: (id: string, state: boolean) => void;
    isLocked?: boolean;
    lockingPuzzleName?: string;
    variant?: 'full' | 'mini';
}> = ({ puzzle, onToggle, onToggleImage, isLocked, lockingPuzzleName, variant = 'full' }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (puzzle.sound) {
            const audio = new Audio(puzzle.sound);
            audioRef.current = audio;

            const setAudioData = () => setDuration(audio.duration);
            const setAudioTime = () => setProgress(audio.currentTime);
            const handleAudioEnd = () => setIsPlaying(false);

            audio.addEventListener('loadedmetadata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            audio.addEventListener('ended', handleAudioEnd);

            return () => {
                audio.removeEventListener('loadedmetadata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
                audio.removeEventListener('ended', handleAudioEnd);
                audio.pause();
                audioRef.current = null;
            }
        }
    }, [puzzle.sound]);
    
    // Stop sound if puzzle becomes locked
    useEffect(() => {
        if (isLocked && audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [isLocked, isPlaying]);

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleStop = () => {
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
    }

    return (
        <div className={`flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg transition-opacity ${isLocked ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-4">
                <label className={`flex items-center mt-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                        type="checkbox"
                        checked={puzzle.isSolved}
                        onChange={(e) => onToggle(puzzle.id, e.target.checked)}
                        className="sr-only peer"
                        disabled={isLocked}
                    />
                    <div className="relative w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <div className="flex-1">
                    <h3 className="font-bold text-amber-400 flex items-center gap-2">
                        {isLocked && <Icon as="lock" className="w-4 h-4 text-slate-400"/>}
                        {puzzle.name}
                    </h3>
                </div>
                {puzzle.image && (
                    <label className={`flex items-center gap-2 text-sm text-sky-300 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>Show Image</span>
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
            </div>
            <div className="pl-14 text-slate-300 whitespace-pre-wrap">
                {puzzle.isSolved ? puzzle.solvedText : puzzle.unsolvedText}
                 {lockingPuzzleName && (
                    <p className="text-red-500 text-xs mt-2">Locked by: {lockingPuzzleName}</p>
                )}
            </div>
            {puzzle.sound && (
                <div className="pl-14 mt-2">
                    <div className={`flex items-center gap-3 w-full bg-slate-700/50 p-2 rounded-lg transition-opacity ${isLocked ? 'opacity-60' : ''}`}>
                        <button onClick={handlePlayPause} disabled={isLocked} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:cursor-not-allowed disabled:hover:bg-slate-700">
                            {isPlaying ? (
                                <svg xmlns="http://www.w.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM7 8a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V8zm4 0a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V8z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9.555 7.168A1 1 0 0 0 8 8v4a1 1 0 0 0 1.555.832l3-2a1 1 0 0 0 0-1.664l-3-2z" /></svg>
                            )}
                        </button>
                        <button onClick={handleStop} disabled={isLocked} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:cursor-not-allowed disabled:hover:bg-slate-700">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM8 8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8z" clipRule="evenodd" /></svg>
                        </button>
                        <div className="flex-grow flex items-center gap-2">
                            <span className="text-xs text-slate-400">{formatTime(progress)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={progress}
                                onChange={handleScrub}
                                disabled={isLocked}
                                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                             <span className="text-xs text-slate-400">{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PuzzleItem;