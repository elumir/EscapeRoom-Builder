import { useMemo } from 'react';
import type { Game } from '../types';

export const usePresenterState = (game: Game | null) => {
    const presenterState = useMemo(() => {
        if (!game) {
            return {
                lockingPuzzlesByRoomId: new Map<string, string>(),
                lockingPuzzlesByPuzzleId: new Map<string, string>(),
                lockingPuzzlesByRoomSolveId: new Map<string, string>(),
                lockingPuzzlesByActionId: new Map<string, string>(),
                lockingPuzzlesByObjectId: new Map<string, string>(),
                inventoryObjects: [],
                discardedObjects: [],
            };
        }

        // 1. Get a set of all solved puzzle IDs for quick lookups.
        const solvedPuzzleIds = new Set<string>();
        game.rooms.forEach(room => {
            room.puzzles.forEach(puzzle => {
                if (puzzle.isSolved) {
                    solvedPuzzleIds.add(puzzle.id);
                }
            });
        });

        // 2. Create maps to hold all locking relationships.
        // An item can be locked by multiple puzzles. We gather all of them.
        type LockInfo = { requiredPuzzleIds: Set<string>; lockingPuzzleNames: Set<string> };
        const roomLockInfo = new Map<string, LockInfo>();
        const puzzleLockInfo = new Map<string, LockInfo>();
        const roomSolveLockInfo = new Map<string, LockInfo>();
        const actionLockInfo = new Map<string, LockInfo>();
        const objectLockInfo = new Map<string, LockInfo>();

        // Populate the info maps by iterating through all puzzles
        game.rooms.forEach(room => {
            room.puzzles.forEach(puzzle => {
                const addLock = (map: Map<string, LockInfo>, itemId: string) => {
                    if (!map.has(itemId)) {
                        map.set(itemId, { requiredPuzzleIds: new Set(), lockingPuzzleNames: new Set() });
                    }
                    const info = map.get(itemId)!;
                    info.requiredPuzzleIds.add(puzzle.id);
                    info.lockingPuzzleNames.add(puzzle.name);
                };

                (puzzle.lockedRoomIds || []).forEach(id => addLock(roomLockInfo, id));
                (puzzle.lockedPuzzleIds || []).forEach(id => addLock(puzzleLockInfo, id));
                (puzzle.lockedRoomSolveIds || []).forEach(id => addLock(roomSolveLockInfo, id));
                (puzzle.lockedActionIds || []).forEach(id => addLock(actionLockInfo, id));
                (puzzle.lockedObjectIds || []).forEach(id => addLock(objectLockInfo, id));
            });
        });

        // 3. Create the final maps for items that are *still locked*.
        // An item is considered locked if NOT ALL of its required puzzles are solved.
        const lockingPuzzlesByRoomId = new Map<string, string>();
        const lockingPuzzlesByPuzzleId = new Map<string, string>();
        const lockingPuzzlesByRoomSolveId = new Map<string, string>();
        const lockingPuzzlesByActionId = new Map<string, string>();
        const lockingPuzzlesByObjectId = new Map<string, string>();

        const populateFinalLockMap = (
            finalMap: Map<string, string>,
            infoMap: Map<string, LockInfo>
        ) => {
            infoMap.forEach((info, itemId) => {
                // Check if any required puzzle for this item is unsolved.
                const isLocked = [...info.requiredPuzzleIds].some(pid => !solvedPuzzleIds.has(pid));
                
                if (isLocked) {
                    // If locked, the value is a comma-separated list of all puzzle names involved.
                    const puzzleNames = [...info.lockingPuzzleNames].join(', ');
                    finalMap.set(itemId, puzzleNames);
                }
            });
        };

        populateFinalLockMap(lockingPuzzlesByRoomId, roomLockInfo);
        populateFinalLockMap(lockingPuzzlesByPuzzleId, puzzleLockInfo);
        populateFinalLockMap(lockingPuzzlesByRoomSolveId, roomSolveLockInfo);
        populateFinalLockMap(lockingPuzzlesByActionId, actionLockInfo);
        populateFinalLockMap(lockingPuzzlesByObjectId, objectLockInfo);

        // 4. Calculate inventory and discarded objects
        const allObjectsWithRoomName = game.rooms.flatMap(r => r.objects.map(o => ({ ...o, roomName: r.name })));
        const inventoryObjects = allObjectsWithRoomName.filter(o => o.showInInventory);
        const discardedObjects = allObjectsWithRoomName.filter(o => !o.showInInventory && o.wasEverInInventory);

        return {
            lockingPuzzlesByRoomId,
            lockingPuzzlesByPuzzleId,
            lockingPuzzlesByRoomSolveId,
            lockingPuzzlesByActionId,
            lockingPuzzlesByObjectId,
            inventoryObjects,
            discardedObjects,
        };
    }, [game]);

    return presenterState;
};
