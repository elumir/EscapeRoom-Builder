// FIX: Replaced incorrect file content with proper type definitions.
// This file was incorrectly populated with the content of `index.tsx`.
// The new content defines and exports the data structures used throughout the application,
// resolving a large number of 'module has no exported member' and other related TypeScript errors.

export interface Asset {
  id: string;
  name: string;
  mime_type: string;
}

export interface InventoryObject {
  id: string;
  name: string;
  description: string;
  showInInventory: boolean;
  wasEverInInventory?: boolean;
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
}

export interface Action {
  id: string;
  name: string;
  description: string;
  image: string | null;
  sound: string | null;
  showImageOverlay: boolean;
  isComplete: boolean;
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
}

export interface Game {
  id: string;
  title: string;
  globalBackgroundColor: string | null;
  mapDisplayMode: 'layered' | 'room-specific';
  rooms: Room[];
  visitedRoomIds: string[];
}