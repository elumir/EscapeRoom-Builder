import { GoogleGenAI } from "@google/genai";

/**
 * As per guidelines, the API key is sourced exclusively from environment variables.
 * The 'ai' instance is initialized here for use in exported functions.
 */
// FIX: Initialize GoogleGenAI with a named apiKey parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an immersive room description using the Gemini AI model.
 * @param roomName The name of the room, used for context.
 * @param existingNotes The current description of the room, which the AI will improve or build upon.
 * @returns A promise that resolves to the AI-generated room description string.
 */
export const generateRoomDescription = async (roomName: string, existingNotes: string): Promise<string> => {
    const prompt = `You are a creative writer for escape room games.
    The room is called "${roomName}".
    The current description is: "${existingNotes}".
    Based on this, write a more vivid and immersive description for the players. If the existing description is empty, create a new one from scratch based on the room name. Keep it to 2-3 short paragraphs. Make it engaging and mysterious.`;

    try {
        // FIX: Use the correct method `ai.models.generateContent` and model name `gemini-2.5-flash`.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        // FIX: Correctly access the generated text from the response.
        return response.text.trim();
    } catch (error) {
        console.error("AI description generation failed:", error);
        // Provide a user-friendly error message.
        throw new Error("Failed to generate description from AI. Please check the console for more details.");
    }
};
