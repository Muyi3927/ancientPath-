import { BlogPost, Category, ApiResponse } from '../types';

// 您的 Cloudflare Worker 地址。
// 部署后端后，请将其替换为真实的 URL (例如 https://your-worker.your-subdomain.workers.dev)
// 在本地开发 Worker 时，通常是 http://localhost:8787
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://ancientpath-backend.fwgudao.workers.dev';

// Helper to handle responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Try to parse error message from JSON
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || response.statusText);
    } catch (e) {
      // If JSON parse fails or no error field
      if (e instanceof Error && e.message !== response.statusText) {
         throw e;
      }
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
  }
  return response.json();
}

export const api = {
  /**
   * Fetch all posts from the backend.
   * Returns null if the API is unreachable, allowing the app to fallback to mock data.
   */
  async getPosts(): Promise<BlogPost[] | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts`);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    } catch (e) {
      console.warn("API offline or unreachable, falling back to mock data.", e);
      return null;
    }
  },

  async getCategories(): Promise<Category[] | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    } catch (e) {
      console.warn("API offline, using default categories.");
      return null;
    }
  },

  async savePost(post: BlogPost, token: string): Promise<{ success: boolean; id: string }> {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(post)
    });
    return handleResponse(response);
  },

  async uploadFile(file: File, token: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await handleResponse<{ url: string }>(response);
    return data.url;
  }
};
