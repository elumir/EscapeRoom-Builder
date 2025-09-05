import type { Game, Room, Asset } from '../types';
import { generateUUID } from '../utils/uuid';

const API_BASE_URL = '/api';

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
    };
    const newGame: Game = {
        id: generateUUID(),
        title,
        globalBackgroundColor: '#000000',
        mapDisplayMode: 'layered',
        rooms: [newRoom],
        visitedRoomIds: [],
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
        const formData = new FormData();
        formData.append('asset', file);

        const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/assets`, {
            method: 'POST',
            body: formData,
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

export const deleteAsset = async (assetId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
            method: 'DELETE',
        });
        await handleResponse(response);
        return true;
    } catch (error) {
        console.error("Failed to delete asset:", error);
        return false;
    }
};