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
  autoAddLockedObjects: boolean;
}

export interface Room {
  id: string;
  name: string;
  image: string | null; // Asset ID
  mapImage: string | null; // Asset ID
  notes: string;
  backgroundColor: string;
  isFullScreenImage: boolean;
  objects: InventoryObject[];
  puzzles: Puzzle[];
  actions: Action[];
}

export interface Game {
  id:string;
  title: string;
  rooms: Room[];
  visitedRoomIds: string[];
}