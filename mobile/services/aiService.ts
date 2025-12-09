import { fetchApi } from './api';

export const generateSummary = async (content: string): Promise<string> => {
    try {
        const response = await fetchApi<{ summary: string }>('/api/generate-summary', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        return response.summary;
    } catch (error) {
        console.error("AI Service Error:", error);
        return "无法生成摘要，请稍后重试。";
    }
};

export const generateBlogIdeas = async (topic: string): Promise<string> => {
    // Placeholder for future backend implementation
    return "AI 创意生成功能正在迁移至后端，暂时不可用。";
};

export const improveWriting = async (text: string): Promise<string> => {
    // Placeholder for future backend implementation
    return text;
};