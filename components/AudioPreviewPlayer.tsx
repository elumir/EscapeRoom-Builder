import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { API_BASE_URL } from '../services/presentationService';

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) {
        return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

const AudioPreviewPlayer: React.FC<{ assetId: string }> = ({ assetId }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const audio = new Audio(`${API_BASE_URL}/assets/${assetId}`);
        audioRef.current = audio;
        setIsLoading(true);

        const setAudioData = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };
        const setAudioTime = () => setProgress(audio.currentTime);
        const handleAudioEnd = () => setIsPlaying(false);
        const handleCanPlay = () => setIsLoading(false);

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleAudioEnd);

        audio.load();

        return () => {
            audio.pause();
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleAudioEnd);
            audioRef.current = null;
        };
    }, [assetId]);

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
            setProgress(0);
        }
    };

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = Number(e.target.value);
            audioRef.current.currentTime = newTime;
            setProgress(newTime);
        }
    };
    
    if (isLoading) {
        return <div className="text-sm text-slate-500 dark:text-slate-400 p-2">Loading audio preview...</div>;
    }

    return (
        <div className="flex items-center gap-3 w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
            <button onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 flex-shrink-0">
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 3.5A1.5 1.5 0 017 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM12.5 3.5A1.5 1.5 0 0114 5v10a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5z" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                )}
            </button>
            <button onClick={handleRewind} title="Rewind to Start" className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 flex-shrink-0">
               <Icon as="rewind" className="h-5 w-5" />
            </button>
            <div className="flex-grow flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatTime(progress)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={progress}
                    onChange={handleScrub}
                    className="w-full h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full"
                />
                 <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatTime(duration)}</span>
            </div>
        </div>
    );
};

export default AudioPreviewPlayer;