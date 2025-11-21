// src/api/index.ts
import { BlogPost, Category } from '../types';

// ==================== 重要配置区 ====================
// 1. 部署后把这里改成你的真实 Workers 域名
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ancientpath-backend.fwgudao.workers.dev';

// 2. 必须和 wrangler.toml 里的 AUTH_SECRET 完全一致！
//    改成你自己设置的那串长密码（至少 32 位）
const AUTH_TOKEN = 'a8f5b3e7d2c9f1g4h6j8k9m2n4p6q8r0t1y3u5i7o9';

// ===================================================

// 统一响应处理
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch { }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // 获取所有文章
  async getPosts(): Promise<BlogPost[]> {
    const res = await fetch(`${API_BASE_URL}/api/posts`);
    return handleResponse<BlogPost[]>(res);
  },

  // 获取单个文章（预览/编辑页用）
  async getPost(id: string): Promise<BlogPost> {
    const res = await fetch(`${API_BASE_URL}/api/posts/${id}`);
    return handleResponse<BlogPost>(res);
  },

  // 获取分类
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE_URL}/api/categories`);
    return handleResponse<Category[]>(res);
  },

  // 保存文章（新建或更新）
  async savePost(post: BlogPost): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(post),
    });
    return handleResponse(res);
  },

  // 上传图片/音频 → 返回完整的 https URL
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'PUT',
      headers: {
        // FormData 会自动设置 Content-Type 为 multipart/form-data + boundary
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: formData,
    });

    const data = await handleResponse<{ url: string }>(res);

    // 防止后端万一没返回 url（防御性编程）
    if (!data.url) {
      throw new Error('上传成功但未返回 URL，请检查后端');
    }

    console.log('上传成功，URL:', data.url); // 方便调试
    return data.url; // ← 这里一定是完整 https:// 开头的地址
  },
  // 新增分类
  async createCategory(name: string): Promise<Category> {
    const res = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ name }),
    });
    return handleResponse<Category>(res);
  },

  // 删除分类
  async deleteCategory(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
  },
};



/* ==================== .env 示例（项目根目录）====================
# .env                → 本地开发读取
# .env.production     → npm run build 时读取
VITE_API_URL=https://ancientpath-backend.fwgudao.workers.dev
============================================================= */
