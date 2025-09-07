
import { generateUUID } from '../utils/uuid';
import type { Game, Asset } from '../types';

export const API_BASE_URL = '/game/api';

// Helper for authenticated fetch requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        if (response.status === 401) {
            // Unauthorized, likely session expired. Reloading will trigger auth flow.
            window.location.reload();
        }
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'An API error occurred');
    }
    if (response.status === 204) { // No Content
        return null;
    }
    return response.json();
};

export const getGames = async (): Promise<Game[]> => {
    return fetchWithAuth(`${API_BASE_URL}/presentations`);
};

export const getGame = async (id: string): Promise<Game | null> => {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/presentations/${id}`);
    } catch (error) {
        console.error(`Failed to fetch game ${id}`, error);
        return null;
    }
};

export const getGameForPresentation = async (id: string): Promise<Game | null> => {
    try {
        // Attempt to get as owner first
        return await getGame(id);
    } catch (error) {
        // If that fails (e.g., 401 or 404), try the public endpoint
        console.warn("Couldn't fetch as owner, trying public endpoint.");
        try {
            const response = await fetch(`/game/api/public/presentation/${id}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (publicError) {
            console.error(`Failed to fetch public game ${id}`, publicError);
            return null;
        }
    }
};

export const createGame = async (title: string): Promise<Game> => {
    const newGame: Game = {
        id: generateUUID(),
        title,
        rooms: [],
        visibility: 'private',
        visitedRoomIds: [],
    };
    return fetchWithAuth(`${API_BASE_URL}/presentations`, {
        method: 'POST',
        body: JSON.stringify(newGame),
    });
};

export const saveGame = async (game: Game): Promise<Game> => {
    return fetchWithAuth(`${API_BASE_URL}/presentations/${game.id}`, {
        method: 'PUT',
        body: JSON.stringify(game),
    });
};

export const deleteGame = async (id: string): Promise<boolean> => {
    try {
        await fetchWithAuth(`${API_BASE_URL}/presentations/${id}`, {
            method: 'DELETE',
        });
        return true;
    } catch (error) {
        console.error(`Failed to delete game ${id}`, error);
        return false;
    }
};

export const updateGameVisibility = async (id: string, visibility: 'public' | 'private'): Promise<void> => {
    await fetchWithAuth(`${API_BASE_URL}/presentations/${id}/visibility`, {
        method: 'PUT',
        body: JSON.stringify({ visibility }),
    });
};

export const getAssetsForGame = async (gameId: string): Promise<Asset[]> => {
    return fetchWithAuth(`${API_BASE_URL}/presentations/${gameId}/assets`);
};

export const uploadAsset = async (gameId: string, file: File): Promise<{ assetId: string }> => {
    const response = await fetch(`${API_BASE_URL}/presentations/${gameId}/assets?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
            'Content-Type': file.type,
        },
        body: file,
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Failed to upload asset');
    }
    return response.json();
};

export const updateAssetName = async (gameId: string, assetId: string, name: string): Promise<void> => {
    await fetchWithAuth(`${API_BASE_URL}/presentations/${gameId}/assets/${assetId}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
    });
};

export const deleteAsset = async (gameId: string, assetId: string): Promise<void> => {
    await fetchWithAuth(`${API_BASE_URL}/presentations/${gameId}/assets/${assetId}`, {
        method: 'DELETE',
    });
};
