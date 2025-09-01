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
  image: string | null; // Base64 Data URL
  sound: string | null; // Base64 Data URL
  showImageOverlay: boolean;
  lockedObjectIds: string[];
  lockedRoomIds: string[];
  lockedPuzzleIds: string[];
  autoAddLockedObjects: boolean;
}

export interface Room {
  id: string;
  name: string;
  image: string | null; // Base64 Data URL
  mapImage: string | null; // Base64 Data URL for the layered map
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