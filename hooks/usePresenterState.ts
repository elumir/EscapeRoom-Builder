import { useMemo } from 'react';
import type { Game } from '../types';

export const usePresenterState = (game: Game | null) => {
    const presenterState = useMemo(() => {
        if (!game) {
            return {
                allUnsolvedPuzzles: [],
                lockingPuzzlesByRoomId: new Map<string, string>(),
                lockingPuzzlesByPuzzleId: new Map<string, string>(),
                lockingPuzzlesByRoomSolveId: new Map<string, string>(),
                inventoryObjects: [],
            };
        }

        const allUnsolvedPuzzles = game.rooms.flatMap(r => r.puzzles).filter(p => !p.isSolved);

        const lockingPuzzlesByRoomId = new Map<string, string>();
        const lockingPuzzlesByPuzzleId = new Map<string, string>();
        const lockingPuzzlesByRoomSolveId = new Map<string, string>();

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
            (puzzle.lockedRoomSolveIds || []).forEach(roomId => {
                if (!lockingPuzzlesByRoomSolveId.has(roomId)) {
                    lockingPuzzlesByRoomSolveId.set(roomId, puzzle.name);
                }
            });
        });

        const inventoryObjects = game.rooms.flatMap(r => r.objects).filter(o => o.showInInventory);

        return {
            allUnsolvedPuzzles,
            lockingPuzzlesByRoomId,
            lockingPuzzlesByPuzzleId,
            lockingPuzzlesByRoomSolveId,
            inventoryObjects,
        };
    }, [game]);

    return presenterState;
};