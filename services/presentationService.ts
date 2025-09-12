import type { Game, Room, Asset } from '../types';
import { generateUUID } from '../utils/uuid';

export const API_BASE_URL = '/game/api';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.message || response.statusText || 'An API error occurred');
    }
    if (response.status === 204) { // No Content
        return;
    }
    return response.json();
};

export const getGames = async (): Promise<Game[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations`);
        // The API now returns the full presentation objects, so no mapping is needed.
        return await handleResponse(response) || [];
    } catch (error) {
        console.error("Failed to fetch games list:", error);
        return [];
    }
};

export const getGame = async (id: string): Promise<Game | undefined> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${id}`);
        return await handleResponse(response);
    } catch (error) {
        console.error("Failed to fetch game:", error);
        return undefined;
    }
};

export const getGameForPresentation = async (id: string): Promise<Game | undefined> => {
    try {
        // First, try the public endpoint. This works for anyone with a link to a public game.
        const publicResponse = await fetch(`${API_BASE_URL}/public/presentation/${id}`);
        if (publicResponse.ok) {
            return await handleResponse(publicResponse);
        }

        // If the public endpoint fails (e.g., game is private, or user is owner),
        // try the authenticated endpoint. This will work for the owner regardless of visibility.
        if (publicResponse.status === 404 || publicResponse.status === 401 || publicResponse.status === 403) {
            console.log("Public fetch failed, trying authenticated endpoint.");
            return await getGame(id);
        }
        
        // If it was another error, throw it.
        await handleResponse(publicResponse);

    } catch (error) {
        console.error("Failed to fetch game for presentation from all sources:", error);
        return undefined;
    }
    return undefined;
};

export const saveGame = async (game: Game): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${game.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(game),
        });
        await handleResponse(response);
    } catch (error) {
        console.error("Failed to save game:", error);
        throw error;
    }
};

export const updateGameVisibility = async (gameId: string, visibility: 'private' | 'public'): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/visibility`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility }),
        });
        await handleResponse(response);
    } catch (error) {
        console.error("Failed to update game visibility:", error);
        throw error;
    }
};

export const createGame = async (title: string): Promise<Game> => {
    const newRoom: Room = {
        id: generateUUID(),
        name: 'First Room',
        image: null,
        mapImage: null,
        notes: '',
        backgroundColor: '#000000',
        isFullScreenImage: false,
        act: 1,
        objects: [],
        puzzles: [],
        actions: [],
        isSolved: false,
        solvedImage: null,
        solvedNotes: '',
        objectRemoveIds: [],
        objectRemoveText: '',
        transitionType: 'none',
        transitionDuration: 1,
    };
    const newGame: Game = {
        id: generateUUID(),
        title,
        visibility: 'private',
        globalBackgroundColor: '#000000',
        mapDisplayMode: 'layered',
        rooms: [newRoom],
        visitedRoomIds: [],
        hideAvailableObjects: false,
        soundtrack: [],
        soundtrackMode: 'sequential',
        soundtrackVolume: 0.5,
        soundboard: [],
        inventoryLayout: 'single',
        inventory1Title: 'Inventory 1',
        inventory2Title: 'Inventory 2',
        fontFamily: null,
        discardMode: 'discard_pile',
    };

    try {
        const response = await fetch(`${API_BASE_URL}/presentations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newGame),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error("Failed to create game:", error);
        throw error;
    }
};


export const deleteGame = async (id: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${id}`, {
            method: 'DELETE',
        });
        await handleResponse(response);
        return true;
    } catch(error) {
        console.error("Failed to delete game:", error);
        return false;
    }
};

export const uploadAsset = async (gameId: string, file: File): Promise<{ assetId: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/assets?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
        });
        return await handleResponse(response);
    } catch (error) {
        console.error("Failed to upload asset:", error);
        throw error;
    }
};

export const getAssetsForGame = async (gameId: string): Promise<Asset[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/assets`);
        return await handleResponse(response) || [];
    } catch (error) {
        console.error("Failed to fetch assets for game:", error);
        return [];
    }
};

export const updateAssetName = async (gameId: string, assetId: string, name: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/assets/${assetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        await handleResponse(response);
        return true;
    } catch(error) {
        console.error("Failed to update asset name:", error);
        return false;
    }
};

export const deleteAsset = async (gameId: string, assetId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/assets/${assetId}`, {
            method: 'DELETE',
        });
        await handleResponse(response);
        return true;
    } catch(error) {
        console.error("Failed to delete asset:", error);
        return false;
    }
};