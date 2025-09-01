
import type { Presentation, Room } from '../types';

const API_BASE_URL = '/api';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'An API error occurred');
    }
    if (response.status === 204) { // No Content
        return;
    }
    return response.json();
};

export const getPresentations = async (): Promise<Presentation[]> => {
    // The backend now returns a lightweight list (id, title).
    // The full data is fetched when a specific presentation is opened.
    // We will adapt the Presentation type here for the dashboard.
    const presentationsList: {id: string, title: string}[] = await fetch(`${API_BASE_URL}/presentations`).then(handleResponse);
    
    // For the dashboard preview, we need a 'rooms' array. We'll return a minimal structure.
    return presentationsList.map(p => ({
        id: p.id,
        title: p.title,
        rooms: [], // Rooms are not needed for the dashboard list view
        visitedRoomIds: [],
    }));
};

export const getPresentation = async (id: string): Promise<Presentation | undefined> => {
    try {
        return await fetch(`${API_BASE_URL}/presentations/${id}`).then(handleResponse);
    } catch (error) {
        console.error("Failed to fetch presentation:", error);
        return undefined;
    }
};

export const savePresentation = async (presentation: Presentation): Promise<void> => {
    await fetch(`${API_BASE_URL}/presentations/${presentation.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(presentation),
    }).then(handleResponse);
};

export const createPresentation = async (title: string): Promise<Presentation> => {
    const newRoom: Room = {
        id: crypto.randomUUID(),
        name: 'First Room',
        image: null,
        mapImage: null,
        notes: '',
        backgroundColor: '#ffffff',
        objects: [],
        puzzles: [],
    };
    const newPresentation: Presentation = {
        id: crypto.randomUUID(),
        title,
        rooms: [newRoom],
        visitedRoomIds: [],
    };

    return await fetch(`${API_BASE_URL}/presentations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPresentation),
    }).then(handleResponse);
};


export const deletePresentation = async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/presentations/${id}`, {
        method: 'DELETE',
    }).then(handleResponse);
};
