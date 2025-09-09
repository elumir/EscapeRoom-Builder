import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as gameService from '../services/presentationService';
import type { Game, InventoryObject, Room as RoomType } from '../types';
import Room from '../components/Slide';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import FontLoader from '../components/FontLoader';

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
  const [isFadingOut, setIsFadingOut] = useState(false); // State to control the fade animation

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
    let fadeTimerId: number;
    // FIX: Replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` to resolve a TypeScript type error.
    // `NodeJS.Timeout` is specific to the Node.js environment, while this code runs in a browser context where `setTimeout` returns a different type (typically a number).
    // Using `ReturnType<typeof setTimeout>` makes the code environment-agnostic.
    let endTransitionTimerId: ReturnType<typeof setTimeout>;

    if (isTransitioning) {
        // When a transition starts, the previous room component is rendered.
        // It starts with opacity-100 because isFadingOut is false.
        
        // On the next frame, we set isFadingOut to true to trigger the fade animation.
        fadeTimerId = requestAnimationFrame(() => {
            setIsFadingOut(true);
        });

        // After the animation duration, we remove the previous room from the DOM.
        endTransitionTimerId = setTimeout(() => {
            setPreviousRoomIndex(null);
            setIsFadingOut(false); // Reset state for the next transition
        }, transitionDuration * 1000);
    }

    return () => {
        // Cleanup timers if the component unmounts or dependencies change mid-transition.
        cancelAnimationFrame(fadeTimerId);
        clearTimeout(endTransitionTimerId);
    };
  }, [isTransitioning, transitionDuration]);


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

    const inRoomObjects = room.objects
        .filter(obj => obj.showInRoomImage && obj.inRoomImage);

    return {
      inventoryObjects,
      visibleMapImages,
      overlayImageUrl,
      globalBackgroundColor: game.globalBackgroundColor,
      inventoryLayout: game.inventoryLayout,
      inventory1Title: game.inventory1Title,
      inventory2Title: game.inventory2Title,
      inRoomObjects,
      fontFamily: game.fontFamily,
      isPresentationMode: true,
    };
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <FontLoader gameId={id} />
      <div className="relative w-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] aspect-video">
        {/* Current Room is always visible underneath */}
        <Room 
          room={currentRoom}
          {...calculateRoomProps(currentRoom)}
          className="absolute inset-0 shadow-none"
        />

        {/* Previous room is layered on top and fades out */}
        {isTransitioning && previousRoom &&
            <div 
                className={`absolute inset-0 w-full h-full transition-opacity ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
                style={{ transitionDuration: `${transitionDuration}s`, transitionTimingFunction: 'ease-in-out' }}
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