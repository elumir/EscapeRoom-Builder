
import type { Presentation, Room } from '../types';
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

export const getPresentations = async (): Promise<Presentation[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations`);
        // The API now returns the full presentation objects, so no mapping is needed.
        return await handleResponse(response) || [];
    } catch (error) {
        console.error("Failed to fetch presentations list:", error);
        return [];
    }
};

export const getPresentation = async (id: string): Promise<Presentation | undefined> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${id}`);
        return await handleResponse(response);
    } catch (error) {
        console.error("Failed to fetch presentation:", error);
        return undefined;
    }
};

export const savePresentation = async (presentation: Presentation): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${presentation.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presentation),
        });
        await handleResponse(response);
    } catch (error) {
        console.error("Failed to save presentation:", error);
        throw error;
    }
};

export const createPresentation = async (title: string): Promise<Presentation> => {
    const newRoom: Room = {
        id: generateUUID(),
        name: 'First Room',
        image: null,
        mapImage: null,
        notes: '',
        backgroundColor: '#ffffff',
        objects: [],
        puzzles: [],
    };
    const newPresentation: Presentation = {
        id: generateUUID(),
        title,
        rooms: [newRoom],
        visitedRoomIds: [],
    };

    try {
        const response = await fetch(`${API_BASE_URL}/presentations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPresentation),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error("Failed to create presentation:", error);
        throw error;
    }
};


export const deletePresentation = async (id: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/presentations/${id}`, {
            method: 'DELETE',
        });
        await handleResponse(response);
        return true;
    } catch(error) {
        console.error("Failed to delete presentation:", error);
        return false;
    }
};