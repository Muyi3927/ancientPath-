import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
    // In a real app, handle this securely. Here we assume env var availability or user input.
    // Since the prompt forbids asking user for key, we assume process.env.API_KEY is set via sandbox environment
    // If not, we gracefully handle it.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API Key not found in env");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const generateBlogIdeas = async (topic: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "API Key missing. Cannot generate.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 3 catchy blog post titles and a brief 1-sentence premise for a blog about "${topic}". The output MUST be in Chinese. Format clearly.`,
        });
        return response.text || "No response generated.";
    } catch (error) {
        console.error("Gemini Error", error);
        return "Error generating ideas. Please try again.";
    }
};

export const generateSummary = async (content: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "API Key missing.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following blog post content into a 2-sentence excerpt suitable for a card preview. The output MUST be in Chinese:\n\n${content.substring(0, 2000)}`, // Limit context
        });
        return response.text || "No summary generated.";
    } catch (error) {
        console.error("Gemini Error", error);
        return "Error generating summary.";
    }
};

export const improveWriting = async (text: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return text;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Improve the following text for clarity, flow, and grammar. The output MUST be in Chinese. Keep it in Markdown format if provided:\n\n${text}`,
        });
        return response.text || text;
    } catch (error) {
        console.error("Gemini Error", error);
        return text;
    }
};