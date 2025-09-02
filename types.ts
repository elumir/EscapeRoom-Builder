export interface InventoryObject {
  id: string;
  name: string;
  description: string;
  showInInventory: boolean;
}

export interface Puzzle {
  id: string;
  name: string;
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
  objects: InventoryObject[];
  puzzles: Puzzle[];
}

export interface Presentation {
  id:string;
  title: string;
  rooms: Room[];
  visitedRoomIds: string[];
}