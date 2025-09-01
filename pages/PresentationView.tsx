
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as presentationService from '../services/presentationService';
import type { Presentation } from '../types';
import Room from '../components/Slide';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';

interface BroadcastMessage {
  type: 'GOTO_ROOM' | 'STATE_UPDATE';
  roomIndex?: number;
}

const PresentationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  const channelName = `presentation-${id}`;

  useBroadcastChannel<BroadcastMessage>(channelName, async (message) => {
    if (message.type === 'GOTO_ROOM' && message.roomIndex !== undefined) {
      setCurrentRoomIndex(message.roomIndex);
    }
    if (message.type === 'STATE_UPDATE') {
        if(id) {
            // FIX: Await promise from presentationService
            const data = await presentationService.getPresentation(id);
            if (data) {
                setPresentation(data);
            }
        }
    }
  });

  useEffect(() => {
    if (id) {
      // FIX: Await promise from presentationService
      const fetchPresentation = async () => {
        const data = await presentationService.getPresentation(id);
        if (data) {
          setPresentation(data);
        }
      };
      fetchPresentation();
    }
  }, [id]);

  if (!presentation) {
    return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">Loading Presentation...</div>;
  }

  const currentRoom = presentation.rooms[currentRoomIndex];

  if (!currentRoom) {
      return <div className="w-screen h-screen bg-black flex items-center justify-center text-white">End of Presentation</div>;
  }
  
  const inventoryItems = presentation.rooms
    .flatMap(r => r.objects)
    .filter(t => t.showInInventory)
    .map(t => t.name);

  const overlayImageUrl = currentRoom.puzzles.find(p => p.showImageOverlay)?.image || null;
  
  const visibleMapImages = presentation.rooms
    .filter(r => presentation.visitedRoomIds.includes(r.id))
    .map(r => r.mapImage)
    .filter(Boolean);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div className="w-full h-full">
        <Room 
          room={currentRoom} 
          inventoryItems={inventoryItems}
          visibleMapImages={visibleMapImages}
          overlayImageUrl={overlayImageUrl}
          className="w-full h-full shadow-none" 
        />
      </div>
    </div>
  );
};

export default PresentationView;
