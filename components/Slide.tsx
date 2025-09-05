import React from 'react';
import type { Room as RoomType } from '../types';
import Icon from './Icon';

interface RoomProps {
  room: RoomType;
  inventoryItems: string[];
  visibleMapImages: (string | null)[];
  className?: string;
  overlayImageUrl?: string | null;
  globalBackgroundColor?: string | null;
}

const Room: React.FC<RoomProps> = ({ room, inventoryItems, visibleMapImages, className, overlayImageUrl, globalBackgroundColor }) => {
  const { backgroundColor: roomBackgroundColor, isFullScreenImage } = room;

  const backgroundColor = globalBackgroundColor ?? roomBackgroundColor;

  const displayImage = room.isSolved && room.solvedImage ? room.solvedImage : room.image;

  const isLightBg = !isFullScreenImage && ['#ffffff', '#fbbf24', '#34d399'].includes(backgroundColor);
  
  const textColor = isLightBg ? '#1f2937' : '#f8fafc';
  const bodyTextColor = isLightBg ? '#374151' : '#e2e8f0';

  const itemCount = inventoryItems.length;
  let inventoryListClass = 'w-full text-xs md:text-sm lg:text-base';
  if (itemCount > 8) { // Threshold for 3 columns
    inventoryListClass += ' columns-3 gap-x-2 md:gap-x-3';
  } else if (itemCount > 4) { // Threshold for 2 columns
    inventoryListClass += ' columns-2 gap-x-2 md:gap-x-3';
  }

  const imageContainerClass = isFullScreenImage
    ? 'w-full h-full'
    : 'w-[70%] h-full flex items-center justify-center border-r border-slate-200 dark:border-slate-700';

  const sidebarContainerClass = 'w-[30%] h-full flex flex-col';

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden shadow-lg flex transition-all duration-300 ${className}`}
      style={{ backgroundColor: isFullScreenImage ? '#000' : backgroundColor }}
    >
      <div className={imageContainerClass}>
        {displayImage ? (
          <img src={`/api/assets/${displayImage}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-400 dark:text-slate-500 flex items-center justify-center w-full h-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      {!isFullScreenImage && (
        <div className={sidebarContainerClass}>
          <div className="relative h-1/2 flex items-center justify-center text-center p-2 md:p-4 border-b border-slate-200/50 dark:border-slate-700/50">
               {visibleMapImages && visibleMapImages.length > 0 ? (
                  <div className="absolute inset-0">
                      {visibleMapImages.map((mapImage, index) => (
                          mapImage && <img key={index} src={`/api/assets/${mapImage}`} alt={`Map Layer ${index + 1}`} className="absolute inset-0 w-full h-full object-contain" />
                      ))}
                  </div>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500">
                    <Icon as="map" className="w-12 h-12" />
                  </div>
               )}
          </div>
          <div className="h-1/2 flex flex-col justify-start p-2 md:p-4 overflow-y-auto">
              <h2 className="text-sm md:text-md font-bold mb-2 sticky top-0 text-center" style={{color: textColor}}>Inventory</h2>
              {inventoryItems.length > 0 ? (
                  <ul className={inventoryListClass}>
                      {inventoryItems.map((item, index) => (
                          <li key={index} className="px-2 py-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-md break-words break-inside-avoid mb-1" style={{color: bodyTextColor}}>{item}</li>
                      ))}
                  </ul>
              ) : (
                   <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">Inventory is empty.</p>
              )}
          </div>
        </div>
      )}

      {overlayImageUrl && (
        <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <img src={`/api/assets/${overlayImageUrl}`} alt="Puzzle Overlay" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default Room;