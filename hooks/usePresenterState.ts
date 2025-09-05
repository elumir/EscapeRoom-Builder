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
                lockingPuzzlesByActionId: new Map<string, string>(),
                inventoryObjects: [],
                discardedObjects: [],
            };
        }

        const allUnsolvedPuzzles = game.rooms.flatMap(r => r.puzzles).filter(p => !p.isSolved);

        const lockingPuzzlesByRoomId = new Map<string, string>();
        const lockingPuzzlesByPuzzleId = new Map<string, string>();
        const lockingPuzzlesByRoomSolveId = new Map<string, string>();
        const lockingPuzzlesByActionId = new Map<string, string>();

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
            (puzzle.lockedActionIds || []).forEach(actionId => {
                if (!lockingPuzzlesByActionId.has(actionId)) {
                    lockingPuzzlesByActionId.set(actionId, puzzle.name);
                }
            });
        });

        const allObjectsWithRoomName = game.rooms.flatMap(r => r.objects.map(o => ({ ...o, roomName: r.name })));
        const inventoryObjects = allObjectsWithRoomName.filter(o => o.showInInventory);
        const discardedObjects = allObjectsWithRoomName.filter(o => !o.showInInventory && o.wasEverInInventory);


        return {
            allUnsolvedPuzzles,
            lockingPuzzlesByRoomId,
            lockingPuzzlesByPuzzleId,
            lockingPuzzlesByRoomSolveId,
            lockingPuzzlesByActionId,
            inventoryObjects,
            discardedObjects,
        };
    }, [game]);

    return presenterState;
};