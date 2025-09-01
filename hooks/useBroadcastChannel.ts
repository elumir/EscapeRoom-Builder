
import { useEffect, useRef } from 'react';

type MessageHandler<T> = (message: T) => void;

export const useBroadcastChannel = <T,>(channelName: string, onMessage: MessageHandler<T>) => {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const handlerRef = useRef(onMessage);

    useEffect(() => {
        handlerRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!channelName) return;

        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        const handleMessage = (event: MessageEvent<T>) => {
            handlerRef.current(event.data);
        };

        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [channelName]);

    const postMessage = (message: T) => {
        channelRef.current?.postMessage(message);
    };

    return postMessage;
};