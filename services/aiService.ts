import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = "You are a world-class creative writer specializing in immersive experiences for escape rooms. Your writing is evocative, concise, and tailored to be read aloud by a game master. Create descriptions that build atmosphere, provide subtle clues, and enhance the sense of mystery and adventure. Focus on sensory details and intriguing elements.";

export const generateText = async (prompt: string): Promise<string> => {
    try {
        if (!process.env.API_KEY) {
            // This error is for the developer, in case the environment is not set up correctly.
            console.error("API_KEY environment variable not set.");
            return "Error: The application is not configured for AI features. Please contact support.";
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.8,
                topP: 0.95,
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("Received an empty response from the AI.");
        }

        return text.trim();

    } catch (error) {
        console.error("AI text generation failed:", error);
        if (error instanceof Error) {
            // Provide a user-friendly error message.
            return `Error: Could not generate text. The AI service may be temporarily unavailable. (${error.message})`;
        }
        return "Error: An unknown error occurred during text generation.";
    }
};
