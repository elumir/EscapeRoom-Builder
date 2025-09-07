
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, InventoryObject } from '../types';
import Room from '../components/Slide';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_SYNC';
  roomIndex?: number;
  game?: Game;
  customItems?: InventoryObject[];
}

const PresentationView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [game, setGame] = useState<Game | null>(null);
    const [customItems, setCustomItems] = useState<InventoryObject[]>([]);
    const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    const handleMessage = (message: BroadcastMessage) => {
        if (message.type === 'GOTO_ROOM' && typeof message.roomIndex === 'number') {
            setCurrentRoomIndex(message.roomIndex);
        }
        if (message.type === 'STATE_SYNC') {
            if (message.game) {
                setGame(message.game);
            }
            if (message.customItems) {
                setCustomItems(message.customItems);
            }
        }
    };

    useBroadcastChannel<BroadcastMessage>(`game-${id}`, handleMessage);

    useEffect(() => {
        const fetchGame = async () => {
            if (!id) return;
            setStatus('loading');
            const data = await gameService.getGameForPresentation(id);
            if (data) {
                setGame(data);
                setStatus('success');
            } else {
                setStatus('error');
            }
        };
        fetchGame();
    }, [id]);

    if (status === 'loading') {
        return <div className="h-screen w-screen bg-black text-white flex items-center justify-center">Loading presentation...</div>;
    }

    if (status === 'error' || !game) {
        return <div className="h-screen w-screen bg-black text-white flex items-center justify-center">Error: Could not load game.</div>;
    }

    const currentRoom = game.rooms[currentRoomIndex];
    if (!currentRoom) {
         return <div className="h-screen w-screen bg-black text-white flex items-center justify-center">Error: Invalid room index.</div>;
    }

    const customInventory = customItems.filter(item => item.showInInventory);
    const regularInventory = game.rooms.flatMap(r => r.objects).filter(o => o.showInInventory);
    const inventoryObjects = [...customInventory, ...regularInventory]
        .sort((a, b) => (b.addedToInventoryTimestamp || 0) - (a.addedToInventoryTimestamp || 0));

    const visibleMapImages = game.mapDisplayMode === 'layered'
        ? game.rooms
            .filter(r => game.visitedRoomIds.includes(r.id))
            .map(r => r.mapImage)
            .filter((i): i is string => !!i)
        : [currentRoom.mapImage].filter((i): i is string => !!i);

    const activeOverlay = currentRoom.objects.find(o => o.showImageOverlay) || currentRoom.puzzles.find(p => p.showImageOverlay) || (currentRoom.actions || []).find(a => a.showImageOverlay);
    const overlayImageUrl = activeOverlay?.image;

    return (
        <div className="h-screen w-screen bg-black flex items-center justify-center">
            <div className="w-full max-w-7xl aspect-video">
                <Room
                    room={currentRoom}
                    inventoryObjects={inventoryObjects}
                    visibleMapImages={visibleMapImages}
                    overlayImageUrl={overlayImageUrl}
                    globalBackgroundColor={game.globalBackgroundColor}
                />
            </div>
        </div>
    );
};

export default PresentationView;
