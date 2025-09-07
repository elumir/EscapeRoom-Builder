import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, InventoryObject, Room as RoomType } from '../types';
import Room from '../components/Slide';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_SYNC';
  roomIndex?: number;
  game?: Game;
  customItems?: InventoryObject[];
}

type Status = 'loading' | 'success' | 'error';

const PresentationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [previousRoomIndex, setPreviousRoomIndex] = useState<number | null>(null);
  const [customItems, setCustomItems] = useState<InventoryObject[]>([]);

  const channelName = `game-${id}`;

  useBroadcastChannel<BroadcastMessage>(channelName, (message) => {
    if (message.customItems) {
      setCustomItems(message.customItems);
    }
    if (message.type === 'GOTO_ROOM' && message.roomIndex !== undefined) {
      if (currentRoomIndex !== message.roomIndex) {
        setPreviousRoomIndex(currentRoomIndex);
        setCurrentRoomIndex(message.roomIndex);
      }
    }
    if (message.type === 'STATE_SYNC' && message.game) {
      setGame(message.game);
      if (message.customItems) {
        setCustomItems(message.customItems);
      }
    }
  });

  useEffect(() => {
    if (id) {
      const fetchInitialState = async () => {
        const data = await gameService.getGameForPresentation(id);
        if (data) {
          setGame(data);
          setStatus('success');
        } else {
          setStatus('error');
        }
      };
      fetchInitialState();
    }
  }, [id]);

  const inventoryObjects = useMemo(() => {
    const gameInventory = game?.rooms
      .flatMap(r => r.objects)
      .filter(t => t.showInInventory) || [];
    
    const customInventory = customItems
      .filter(item => item.showInInventory);
      
    return [...customInventory, ...gameInventory];
  }, [game, customItems]);

  const currentRoom = game?.rooms[currentRoomIndex];
  const previousRoom = previousRoomIndex !== null ? game?.rooms[previousRoomIndex] : null;

  const isTransitioning = !!previousRoom && currentRoom?.transitionType === 'fade';
  const transitionDuration = isTransitioning ? (currentRoom?.transitionDuration || 1) : 0;

  useEffect(() => {
    if (isTransitioning) {
      const handle = setTimeout(() => {
        setPreviousRoomIndex(null);
      }, transitionDuration * 1000);
      return () => clearTimeout(handle);
    }
  }, [isTransitioning, transitionDuration, currentRoomIndex]);


  if (status === 'loading') {
    return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">Loading Game...</div>;
  }

  if (status === 'error' || !game || !currentRoom) {
     return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">Could not load game. It may be private or does not exist.</div>;
  }
  
  const calculateRoomProps = (room: RoomType) => {
    const overlayImageUrl = 
      room.puzzles.find(p => p.showImageOverlay)?.image ||
      (room.actions || []).find(a => a.showImageOverlay)?.image ||
      game.rooms.flatMap(r => r.objects).find(o => o.showImageOverlay)?.image ||
      null;
    
    const visibleMapImages = (game.mapDisplayMode === 'room-specific')
      ? [room.mapImage].filter(Boolean)
      : game.rooms
        .filter(r => game.visitedRoomIds.includes(r.id))
        .map(r => r.mapImage)
        .filter(Boolean);

    return {
      inventoryObjects,
      visibleMapImages,
      overlayImageUrl,
      globalBackgroundColor: game.globalBackgroundColor
    };
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] aspect-video">
        {/* Current Room is always visible underneath */}
        <Room 
          room={currentRoom}
          {...calculateRoomProps(currentRoom)}
          className="w-full h-full shadow-none"
        />

        {/* Previous room is layered on top and fades out */}
        {isTransitioning && previousRoom &&
            <div 
                className="absolute inset-0 w-full h-full opacity-0 transition-opacity"
                style={{ transitionDuration: `${transitionDuration}s`, transitionTimingFunction: 'ease-in-out' }}
                ref={el => {
                    if (el) {
                        el.style.opacity = '1';
                        requestAnimationFrame(() => {
                            el.style.opacity = '0';
                        });
                    }
                }}
            >
                <Room
                  room={previousRoom}
                  {...calculateRoomProps(previousRoom)}
                  className="w-full h-full shadow-none"
                />
            </div>
        }
      </div>
    </div>
  );
};

export default PresentationView;