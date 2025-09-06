import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, InventoryObject } from '../types';
import Room from '../components/Slide';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_UPDATE';
  roomIndex?: number;
  customItems?: InventoryObject[];
}

type Status = 'loading' | 'success' | 'error';

const PresentationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [customItems, setCustomItems] = useState<InventoryObject[]>([]);

  const channelName = `game-${id}`;

  const fetchLatestState = async () => {
    if (id) {
      const data = await gameService.getGame(id);
      if (data) {
        setGame(data);
        setStatus('success');
      } else {
        setStatus('error');
      }
    }
  };

  useBroadcastChannel<BroadcastMessage>(channelName, async (message) => {
    if (message.customItems) {
      setCustomItems(message.customItems);
    }
    if (message.type === 'GOTO_ROOM' && message.roomIndex !== undefined) {
      setCurrentRoomIndex(message.roomIndex);
    }
    if (message.type === 'STATE_UPDATE') {
      await fetchLatestState();
    }
  });

  useEffect(() => {
    fetchLatestState();
  }, [id]);

  const inventoryItems = useMemo(() => {
    const gameInventory = game?.rooms
      .flatMap(r => r.objects)
      .filter(t => t.showInInventory)
      .map(t => t.name) || [];
    
    const customInventory = customItems
      .filter(item => item.showInInventory)
      .map(item => item.name);
      
    return [...customInventory, ...gameInventory];
  }, [game, customItems]);

  if (status === 'loading') {
    return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">Loading Game...</div>;
  }

  if (status === 'error' || !game) {
     return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">Could not load game.</div>;
  }

  const currentRoom = game.rooms[currentRoomIndex];

  if (!currentRoom) {
      return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">End of Game</div>;
  }
  
  const overlayImageUrl = 
    currentRoom.puzzles.find(p => p.showImageOverlay)?.image ||
    (currentRoom.actions || []).find(a => a.showImageOverlay)?.image ||
    game.rooms.flatMap(r => r.objects).find(o => o.showImageOverlay)?.image ||
    null;
  
  const visibleMapImages = (game.mapDisplayMode === 'room-specific')
    ? [currentRoom.mapImage].filter(Boolean)
    : game.rooms
      .filter(r => game.visitedRoomIds.includes(r.id))
      .map(r => r.mapImage)
      .filter(Boolean);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] aspect-video">
        <Room 
          room={currentRoom} 
          inventoryItems={inventoryItems}
          visibleMapImages={visibleMapImages}
          overlayImageUrl={overlayImageUrl}
          className="w-full h-full shadow-none" 
          globalBackgroundColor={game.globalBackgroundColor}
        />
      </div>
    </div>
  );
};

export default PresentationView;