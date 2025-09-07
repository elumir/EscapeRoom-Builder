
export interface InventoryObject {
    id: string;
    name: string;
    description: string;
    image: string | null;
    showImageOverlay: boolean;
    showInInventory: boolean;
    wasEverInInventory: boolean;
    addedToInventoryTimestamp?: number;
    nameColor?: string | null;
}

export interface Puzzle {
    id: string;
    name: string;
    unsolvedText: string;
    solvedText: string;
    answer: string | null;
    image: string | null;
    showImageOverlay: boolean;
    isSolved: boolean;
    sound: string | null;
    autoAddLockedObjects: boolean;
    lockedObjectIds: string[];
    discardObjectIds?: string[];
    lockedRoomSolveIds?: string[];
    completedActionIds?: string[];
    lockedRoomIds?: string[];
    lockedPuzzleIds?: string[];
    lockedActionIds?: string[];
    lockedActNumbers?: number[];
}

export interface Action {
    id: string;
    name: string;
    description: string;
    image: string | null;
    showImageOverlay: boolean;
    isComplete: boolean;
    hideCompleteButton?: boolean;
    sound: string | null;
}

export interface Room {
    id: string;
    name:string;
    image: string | null;
    mapImage: string | null;
    notes: string;
    backgroundColor: string;
    isFullScreenImage: boolean;
    isSolved: boolean;
    solvedImage: string | null;
    solvedNotes: string;
    act: number;
    objects: InventoryObject[];
    puzzles: Puzzle[];
    actions: Action[];
    objectRemoveIds?: string[];
    objectRemoveText?: string;
}

export interface SoundtrackTrack {
    id: string;
    name: string;
}

export interface Game {
    id: string;
    title: string;
    rooms: Room[];
    visibility: 'private' | 'public';
    visitedRoomIds: string[];
    globalBackgroundColor?: string | null;
    mapDisplayMode?: 'room-specific' | 'layered';
    hideAvailableObjects?: boolean;
    soundtrack?: SoundtrackTrack[];
    soundtrackMode?: 'sequential' | 'shuffle';
    soundtrackVolume?: number;
}

export interface Asset {
    id: string;
    name: string;
    mime_type: string;
}
