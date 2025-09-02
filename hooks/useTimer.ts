import { useState, useEffect } from 'react';
import type { Timer } from '../types';

const calculateRemaining = (timer: Timer): number => {
    if (!timer.isRunning || !timer.startTime) {
        return timer.remainingTime;
    }
    const elapsed = (Date.now() - timer.startTime) / 1000;
    return Math.max(0, timer.remainingTime - elapsed);
};

export const useTimer = (timer: Timer | undefined) => {
    const [remainingSeconds, setRemainingSeconds] = useState(timer?.duration || 0);

    useEffect(() => {
        if (!timer) return;

        if (!timer.isRunning) {
            setRemainingSeconds(timer.remainingTime);
            return;
        }

        // Set initial value
        setRemainingSeconds(calculateRemaining(timer));

        const interval = setInterval(() => {
            const remaining = calculateRemaining(timer);
            setRemainingSeconds(remaining);
            if (remaining === 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [timer]);

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);

    return {
        displayTime: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        isTimeUp: remainingSeconds <= 0,
    };
};
