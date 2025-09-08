// FIX: Replaced incorrect file content with proper type definitions.
// This file was incorrectly populated with the content of `index.tsx`.
// The new content defines and exports the data structures used throughout the application,
// resolving a large number of 'module has no exported member' and other related TypeScript errors.

export interface Asset {
  id: string;
  name: string;
  mime_type: string;
}

export interface SoundtrackTrack {
  id: string;
  name: string;
}

export interface SoundboardClip {
  id: string;
  name: string;
}

export interface InventoryObject {
  id: string;
  name: string;
  description: string;
  showInInventory: boolean;
  wasEverInInventory?: boolean;
  image: string | null;
  inRoomImage: string | null;
  showImageOverlay: boolean;
  addedToInventoryTimestamp?: number;
  nameColor?: string;
  inventorySlot?: 1 | 2;
}

export interface Puzzle {
  id: string;
  name: string;
  answer: string;
  isSolved: boolean;
  unsolvedText: string;
  solvedText: string;
  image: string | null;
  sound: string | null;
  showImageOverlay: boolean;
  lockedObjectIds: string[];
  discardObjectIds: string[];
  lockedRoomIds: string[];
  lockedPuzzleIds: string[];
  lockedRoomSolveIds: string[];
  lockedActionIds: string[];
  completedActionIds: string[];
  autoAddLockedObjects: boolean;
  lockedActNumbers?: number[];
}

export interface Action {
  id: string;
  name: string;
  description: string;
  image: string | null;
  sound: string | null;
  showImageOverlay: boolean;
  isComplete: boolean;
  hideCompleteButton?: boolean;
}

export interface Room {
  id: string;
  name: string;
  image: string | null;
  mapImage: string | null;
  notes: string;
  backgroundColor: string;
  isFullScreenImage: boolean;
  act: number;
  objects: InventoryObject[];
  puzzles: Puzzle[];
  actions: Action[];
  isSolved: boolean;
  solvedImage: string | null;
  solvedNotes: string;
  objectRemoveIds: string[];
  objectRemoveText: string;
  transitionType?: 'none' | 'fade';
  transitionDuration?: number;
}

export interface Game {
  id: string;
  title: string;
  visibility: 'private' | 'public';
  globalBackgroundColor: string | null;
  mapDisplayMode: 'layered' | 'room-specific';
  rooms: Room[];
  visitedRoomIds: string[];
  hideAvailableObjects?: boolean;
  soundtrack?: SoundtrackTrack[];
  soundtrackMode?: 'sequential' | 'shuffle' | 'loop';
  soundtrackVolume?: number;
  soundboard?: SoundboardClip[];
  inventoryLayout?: 'single' | 'dual';
  inventory1Title?: string;
  inventory2Title?: string;
}