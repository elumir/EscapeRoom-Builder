import { useMemo } from 'react';
import type { Presentation } from '../types';

export const usePresenterState = (presentation: Presentation | null) => {
    const presenterState = useMemo(() => {
        if (!presentation) {
            return {
                allUnsolvedPuzzles: [],
                lockingPuzzlesByRoomId: new Map<string, string>(),
                lockingPuzzlesByPuzzleId: new Map<string, string>(),
                inventoryObjects: [],
            };
        }

        const allUnsolvedPuzzles = presentation.rooms.flatMap(r => r.puzzles).filter(p => !p.isSolved);

        const lockingPuzzlesByRoomId = new Map<string, string>();
        const lockingPuzzlesByPuzzleId = new Map<string, string>();

        allUnsolvedPuzzles.forEach(puzzle => {
            (puzzle.lockedRoomIds || []).forEach(roomId => {
                if (!lockingPuzzlesByRoomId.has(roomId)) {
                    lockingPuzzlesByRoomId.set(roomId, puzzle.name);
                }
            });
            (puzzle.lockedPuzzleIds || []).forEach(puzzleId => {
                if (!lockingPuzzlesByPuzzleId.has(puzzleId)) {
                    lockingPuzzlesByPuzzleId.set(puzzleId, puzzle.name);
                }
            });
        });

        const inventoryObjects = presentation.rooms.flatMap(r => r.objects).filter(o => o.showInInventory);

        return {
            allUnsolvedPuzzles,
            lockingPuzzlesByRoomId,
            lockingPuzzlesByPuzzleId,
            inventoryObjects,
        };
    }, [presentation]);

    return presenterState;
};
