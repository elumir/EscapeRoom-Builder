import React from 'react';
import type { Room as RoomType, InventoryObject } from '../types';
import Icon from './Icon';
import { API_BASE_URL } from '../services/presentationService';

interface RoomProps {
  room: RoomType;
  inventoryObjects: InventoryObject[];
  visibleMapImages: (string | null)[];
  className?: string;
  overlayImageUrl?: string | null;
  globalBackgroundColor?: string | null;
  inventoryLayout?: 'single' | 'dual';
  inventory1Title?: string;
  inventory2Title?: string;
  inRoomObjectImages?: string[];
}

const getObjectColorClass = (nameColor?: string | null): string => {
    const defaultClass = 'bg-slate-200/50 dark:bg-slate-800/50';
    if (!nameColor) return defaultClass;

    // If it's already a background color, use it.
    if (nameColor.startsWith('bg-')) return nameColor;

    // Map old text colors to new background colors for backward compatibility.
    const colorMap: Record<string, string> = {
        'text-green-500': 'bg-green-500 text-white',
        'text-green-400': 'bg-green-500 text-white',
        'text-yellow-500': 'bg-amber-500 text-white',
        'text-yellow-400': 'bg-amber-500 text-white',
        'text-blue-500': 'bg-blue-500 text-white',
        'text-blue-400': 'bg-blue-500 text-white',
        'text-red-500': 'bg-red-500 text-white',
        'text-red-400': 'bg-red-500 text-white',
        'text-cyan-500': 'bg-cyan-500 text-white',
        'text-cyan-400': 'bg-cyan-500 text-white',
        'text-pink-500': 'bg-pink-500 text-white',
        'text-pink-400': 'bg-pink-500 text-white',
        'text-gray-200': 'bg-gray-200 text-gray-800 dark:bg-gray-300 dark:text-gray-900',
        'text-gray-400': 'bg-gray-200 text-gray-800 dark:bg-gray-300 dark:text-gray-900',
    };
    return colorMap[nameColor] || defaultClass;
};


const Room: React.FC<RoomProps> = ({ 
    room, 
    inventoryObjects, 
    visibleMapImages, 
    className, 
    overlayImageUrl, 
    globalBackgroundColor,
    inventoryLayout = 'single',
    inventory1Title = 'Inventory 1',
    inventory2Title = 'Inventory 2',
    inRoomObjectImages
}) => {
  const { backgroundColor: roomBackgroundColor, isFullScreenImage } = room;

  const backgroundColor = globalBackgroundColor ?? roomBackgroundColor;

  const displayImage = room.isSolved && room.solvedImage ? room.solvedImage : room.image;

  const isLightBg = !isFullScreenImage && ['#ffffff', '#fbbf24', '#34d399'].includes(backgroundColor);
  
  const textColor = isLightBg ? '#1f2937' : '#f8fafc';
  const bodyTextColor = isLightBg ? '#374151' : '#e2e8f0';

  const imageContainerClass = isFullScreenImage
    ? 'w-full h-full'
    : 'w-[70%] h-full flex items-center justify-center border-r border-slate-200 dark:border-slate-700';

  const sidebarContainerClass = 'w-[30%] h-full flex flex-col';
  
  const inventoryList1 = inventoryObjects.filter(item => (item.inventorySlot || 1) === 1);
  const inventoryList2 = inventoryObjects.filter(item => item.inventorySlot === 2);

  const renderInventoryList = (items: InventoryObject[], bodyTextColorOverride: string) => {
    if (items.length === 0) return null;

    let inventoryListClass = 'w-full text-xs md:text-sm lg:text-base';
    // Only apply columns for single layout mode to avoid nested columns
    if (inventoryLayout !== 'dual' && items.length > 4) {
      inventoryListClass += ' columns-2 gap-x-2 md:gap-x-3';
    }

    return (
      <ul className={inventoryListClass}>
        {items.map((item, index) => {
          const colorClass = getObjectColorClass(item.nameColor);
          return (
            <li
              key={item.id || index}
              className={`px-2 py-1 rounded-md break-words break-inside-avoid mb-1 ${colorClass}`}
              style={{ color: colorClass.includes('text-') ? undefined : bodyTextColorOverride }}
            >
              {item.name}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden shadow-lg flex transition-all duration-300 ${className}`}
      style={{ backgroundColor: isFullScreenImage ? '#000' : backgroundColor }}
    >
      <div className={`${imageContainerClass} relative`}>
        {displayImage ? (
          <img src={`${API_BASE_URL}/assets/${displayImage}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-400 dark:text-slate-500 flex items-center justify-center w-full h-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {inRoomObjectImages?.map((imageId) => (
            <div key={imageId} className="absolute inset-0 w-full h-full z-10">
                <img 
                    src={`${API_BASE_URL}/assets/${imageId}`} 
                    alt="Object in room" 
                    className="w-full h-full object-contain pointer-events-none" 
                />
            </div>
        ))}
      </div>
      
      {!isFullScreenImage && (
        <div className={sidebarContainerClass}>
          <div className="relative h-1/2 flex items-center justify-center text-center p-2 md:p-4 border-b border-slate-200/50 dark:border-slate-700/50">
               {visibleMapImages && visibleMapImages.length > 0 ? (
                  <div className="absolute inset-0">
                      {visibleMapImages.map((mapImage, index) => (
                          mapImage && <img key={index} src={`${API_BASE_URL}/assets/${mapImage}`} alt={`Map Layer ${index + 1}`} className="absolute inset-0 w-full h-full object-contain" />
                      ))}
                  </div>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500">
                    <Icon as="map" className="w-12 h-12" />
                  </div>
               )}
          </div>
          <div className="h-1/2 flex flex-col justify-start p-2 md:p-4 overflow-y-auto">
              {inventoryLayout === 'dual' ? (
                inventoryObjects.length > 0 ? (
                    <div className="flex gap-x-2 md:gap-x-4 w-full">
                        <div className="w-1/2">
                            {inventoryList1.length > 0 && (
                                <>
                                    <h2 className="text-sm md:text-md font-bold mb-2 sticky top-0 text-center" style={{color: textColor}}>{inventory1Title}</h2>
                                    {renderInventoryList(inventoryList1, bodyTextColor)}
                                </>
                            )}
                        </div>
                        <div className="w-1/2">
                            {inventoryList2.length > 0 && (
                                <>
                                    <h2 className="text-sm md:text-md font-bold mb-2 sticky top-0 text-center" style={{color: textColor}}>{inventory2Title}</h2>
                                    {renderInventoryList(inventoryList2, bodyTextColor)}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center pt-4">Inventory is empty.</p>
                )
              ) : (
                <>
                  <h2 className="text-sm md:text-md font-bold mb-2 sticky top-0 text-center" style={{color: textColor}}>Inventory</h2>
                  {inventoryObjects.length > 0 ? (
                      renderInventoryList(inventoryObjects, bodyTextColor)
                  ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">Inventory is empty.</p>
                  )}
                </>
              )}
          </div>
        </div>
      )}

      {overlayImageUrl && (
        <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <img src={`${API_BASE_URL}/assets/${overlayImageUrl}`} alt="Puzzle Overlay" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default Room;