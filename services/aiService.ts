import { GoogleGenAI, Type } from "@google/genai";
import type { Presentation, Room } from '../types';

// The instructions state to use process.env.API_KEY directly, assuming it's available in the execution context.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRoomDescription = async (presentationTitle: string, roomName: string): Promise<string> => {
    const prompt = `You are a creative writer for an escape room game. 
    The game is called "${presentationTitle}".
    Write an atmospheric and engaging description for a room named "${roomName}".
    The description should be 2-3 sentences long.
    Do not use markdown or any special formatting. Just return the plain text of the description.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating room description:", error);
        throw new Error("Failed to generate description from AI.");
    }
};

export const generatePuzzleIdea = async (
    presentation: Presentation,
    currentRoom: Room,
): Promise<{ name: string; unsolvedText: string; solvedText: string; }> => {
    const existingPuzzles = currentRoom.puzzles.map(p => p.name).join(', ') || 'None';
    const prompt = `You are a puzzle designer for an escape room game.
    The game is called "${presentation.title}".
    The current room is named "${currentRoom.name}" and its description is: "${currentRoom.notes}".
    The room already has these puzzles: ${existingPuzzles}.
    
    Generate a new, creative puzzle idea that fits the theme of the room and presentation.
    
    Provide the output in JSON format with three keys: "name", "unsolvedText", and "solvedText".
    - "name": A short, clever name for the puzzle.
    - "unsolvedText": The clue or situation the players see before solving the puzzle.
    - "solvedText": The message or result players see after solving it.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A short, clever name for the puzzle." },
                        unsolvedText: { type: Type.STRING, description: "The clue or situation the players see before solving the puzzle." },
                        solvedText: { type: Type.STRING, description: "The message or result players see after solving it." },
                    },
                    required: ["name", "unsolvedText", "solvedText"],
                },
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating puzzle idea:", error);
        throw new Error("Failed to generate puzzle idea from AI.");
    }
};
