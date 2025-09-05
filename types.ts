export interface InventoryObject {
  id: string;
  name: string;
  description: string;
  showInInventory: boolean;
}

export interface Action {
  id: string;
  name: string;
  description: string;
  image: string | null; // Asset ID
  showImageOverlay: boolean;
  isComplete?: boolean;
}

export interface Puzzle {
  id: string;
  name: string;
  answer: string;
  isSolved: boolean;
  unsolvedText: string;
  solvedText: string;
  image: string | null; // Asset ID
  sound: string | null; // Asset ID
  showImageOverlay: boolean;
  lockedObjectIds: string[];
  lockedRoomIds: string[];
  lockedPuzzleIds: string[];
  lockedRoomSolveIds: string[];
  autoAddLockedObjects: boolean;
  autoSolveRooms?: boolean;
}

export interface Room {
  id: string;
  name: string;
  image: string | null; // Asset ID
  mapImage: string | null; // Asset ID
  notes: string;
  backgroundColor: string;
  isFullScreenImage: boolean;
  act: number;
  objectRemoveIds: string[];
  objectRemoveText?: string;
  objects: InventoryObject[];
  puzzles: Puzzle[];
  actions: Action[];
  isSolved: boolean;
  solvedImage: string | null; // Asset ID
  solvedNotes: string;
}

export interface Game {
  id:string;
  title: string;
  globalBackgroundColor?: string | null;
  mapDisplayMode?: 'room-specific' | 'layered';
  rooms: Room[];
  visitedRoomIds: string[];
}

export interface Asset {
  id: string;
  mime_type: string;
  name: string;
}