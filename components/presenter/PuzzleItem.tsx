import React, { useState, useRef, useEffect } from 'react';
import type { Puzzle } from '../../types';
import Icon from '../Icon';
import { API_BASE_URL } from '../../services/presentationService';
import MarkdownRenderer from '../MarkdownRenderer';

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

const PuzzleItem: React.FC<{
    puzzle: Puzzle;
    onToggle: (id: string, state: boolean) => void;
    onToggleImage: (id: string, state: boolean) => void;
    onAttemptSolve: (id: string) => void;
    isLocked?: boolean;
    lockingPuzzleName?: string;
    variant?: 'full' | 'mini';
}> = ({ puzzle, onToggle, onToggleImage, onAttemptSolve, isLocked, lockingPuzzleName, variant = 'full' }) => {
    // --- All Hooks must be at the top level ---
    const [isFlashing, setIsFlashing] = useState(false);
    const prevIsSolved = useRef(puzzle.isSolved);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    // --- All Effects ---
    useEffect(() => {
        // Check if the puzzle was just solved to trigger a flash effect
        if (puzzle.isSolved && !prevIsSolved.current) {
            setIsFlashing(true);
            const timer = setTimeout(() => {
                setIsFlashing(false);
            }, 1000); // Flash duration

            return () => clearTimeout(timer);
        }
        prevIsSolved.current = puzzle.isSolved;
    }, [puzzle.isSolved]);

    useEffect(() => {
        // No sound or puzzle is solved, do not set up audio.
        if (!puzzle.sound || puzzle.isSolved) {
            return;
        }

        const audio = new Audio(`${API_BASE_URL}/assets/${puzzle.sound}`);
        audioRef.current = audio;

        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setProgress(audio.currentTime);
        const handleAudioEnd = () => setIsPlaying(false);

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleAudioEnd);

        // Cleanup function for when sound changes, puzzle is solved, or component unmounts.
        return () => {
            audio.pause();
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleAudioEnd);
            audioRef.current = null;
            setIsPlaying(false);
            setProgress(0);
        }
    }, [puzzle.sound, puzzle.isSolved]);
    
    // Effect to stop sound if puzzle becomes locked
    useEffect(() => {
        if (isLocked && audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [isLocked, isPlaying]);

    // --- All Handlers ---
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

    const handleCompleteClick = () => {
        if (isLocked) return;

        if (puzzle.answer) {
            onAttemptSolve(puzzle.id);
        } else {
            onToggle(puzzle.id, true);
        }
    };

    // --- Conditional Rendering ---
    if (puzzle.isSolved) {
        const CheckmarkIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        
        const flashClass = isFlashing ? 'border-green-500' : 'border-transparent';
        const transitionClass = 'transition-colors duration-1000';

        if (variant === 'mini') {
            return (
                <div className={`mt-1 flex items-center gap-1 p-1 rounded-sm border ${flashClass} ${transitionClass}`}>
                    <div className="text-green-400 flex-shrink-0">
                        <CheckmarkIcon className="h-3 w-3" />
                    </div>
                    <h4 className="font-semibold text-slate-500 text-[9px] truncate line-through">{puzzle.name}</h4>
                </div>
            );
        }

        return (
            <div className={`flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border-2 ${flashClass} ${transitionClass}`}>
                <div className="text-green-400 mt-1 flex-shrink-0">
                    <CheckmarkIcon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-400 line-through">{puzzle.name}</h3>
                    <div className="text-slate-300 mt-2">
                        <MarkdownRenderer content={puzzle.solvedText} />
                    </div>
                </div>
            </div>
        );
    }

    // --- Unsolved State ---
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
                <div className="pl-4 mt-2">
                    <div className={`flex items-center gap-3 w-full bg-slate-700/50 p-2 rounded-lg transition-opacity ${isLocked ? 'opacity-60' : ''}`}>
                        <button onClick={handlePlayPause} disabled={isLocked} title={isPlaying ? "Pause" : "Play"} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:cursor-not-allowed disabled:hover:bg-slate-700">
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 3.5A1.5 1.5 0 017 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM12.5 3.5A1.5 1.5 0 0114 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                            )}
                        </button>
                        <button onClick={handleRewind} disabled={isLocked} title="Rewind to Start" className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 flex-shrink-0 disabled:cursor-not-allowed disabled:hover:bg-slate-700">
                           <Icon as="rewind" className="h-5 w-5" />
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