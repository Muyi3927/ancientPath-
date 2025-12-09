// services/api.ts
import { BlogPost, Category } from '../types';

// Automatically switch to local backend in development
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:8787' 
  : 'https://api.ancientpath.dpdns.org';

export const loginUser = async (password: string): Promise<{ success: boolean; token?: string; error?: string }> => {
  const url = `${API_BASE_URL}/api/login`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    
    if (!response.ok) {
       return { success: false, error: 'Login failed' };
    }
    
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, error: String(e) };
  }
};

/**
 * 统一处理 API 请求的函数
 * @param endpoint API 的路径 (例如 /api/posts)
 * @param options fetch 函数的配置选项
 * @returns Promise<T>
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 从 localStorage 获取 Token (这里我们直接使用密码作为 Token)
  const token = localStorage.getItem('authToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '无法解析错误信息' }));
      console.error(`API Error: ${response.status} ${response.statusText}`, errorData);
      throw new Error(errorData.message || `请求失败，状态码: ${response.status}`);
    }
    
    if (response.status === 204) {
      return null as T;
    }

    const result = await response.json();

    // 1. 如果是数组，直接返回 (getPosts, getCategories)
    if (Array.isArray(result)) {
        return result as T;
    }

    // 2. 如果是带有 success 字段的对象 (create/update/delete)
    if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
            // 如果有 data 字段，返回 data
            if (result.data) return result.data;
            // 如果有 category 字段 (createCategory 特例)，返回 category
            if (result.category) return result.category;
            // 否则返回整个对象 (例如 { success: true, id: ... })
            return result as T;
        } else {
            throw new Error(result.error || 'API 请求返回一个错误');
        }
    }

    // 3. 其他情况，直接返回 (getPostById, getUploadUrl)
    return result as T;
  } catch (error) {
    console.error('Fetch API 出现严重错误:', error);
    throw error;
  }
}

// ==================== 数据转换辅助函数 ====================

const transformPost = (post: any): BlogPost => ({
    ...post,
    id: Number(post.id),
    categoryId: post.categoryId ? Number(post.categoryId) : 0,
    createdAt: Number(post.createdAt),
    updatedAt: post.updatedAt ? Number(post.updatedAt) : undefined,
    views: Number(post.views || 0),
});

const transformCategory = (cat: any): Category => ({
    ...cat,
    id: Number(cat.id),
    parentId: cat.parentId ? Number(cat.parentId) : null,
});

// ==================== API 函数 ====================

// 获取所有文章
export const getPosts = async (): Promise<BlogPost[]> => {
    const posts = await fetchApi<any[]>('/api/posts');
    return posts.map(transformPost);
};

// 根据 ID 获取单篇文章
export const getPostById = async (id: number): Promise<BlogPost> => {
    const post = await fetchApi<any>(`/api/posts/${id}`);
    return transformPost(post);
};

// 获取所有分类
export const getCategories = async (): Promise<Category[]> => {
    const cats = await fetchApi<any[]>('/api/categories');
    return cats.map(transformCategory);
};

// 创建新文章
export const createPost = async (postData: Omit<BlogPost, 'id' | 'createdAt' | 'author' | 'views'>): Promise<BlogPost> => {
  const res = await fetchApi<any>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  });
  // 构造返回对象，因为后端只返回 { success: true, id: ... }
  return {
      ...postData,
      id: Number(res.id),
      createdAt: Date.now(),
      author: { id: 'admin', username: 'Admin', role: 'ADMIN' } as any,
      views: 0,
      tags: postData.tags || [],
      categoryId: postData.categoryId || 0
  } as BlogPost;
};

// 更新文章
export const updatePost = async (id: number, postData: Partial<BlogPost>): Promise<BlogPost> => {
  // 后端统一使用 POST /api/posts 处理创建和更新 (通过 id 判断)
  await fetchApi('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ ...postData, id }),
  });
  return { id, ...postData } as BlogPost;
};

// 删除文章
export const deletePost = (id: number): Promise<void> => fetchApi(`/api/posts/${id}`, { method: 'DELETE' });

// 创建新分类
export const createCategory = async (categoryData: { name: string; parentId?: number }): Promise<Category> => {
  const cat = await fetchApi<any>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
  });
  return transformCategory(cat);
};

// 删除分类
export const deleteCategory = (id: number): Promise<void> => {
  return fetchApi(`/api/categories/${id}`, {
      method: 'DELETE',
  });
};

// 上传文件 (直接上传到后端)
export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // 注意：fetchApi 默认设置 Content-Type: application/json，
  // 但 FormData 需要浏览器自动设置 Content-Type (包含 boundary)，
  // 所以我们需要手动处理 fetch，或者修改 fetchApi 支持 FormData。
  // 这里为了简单，直接调用 fetchApi，但我们需要让 fetchApi 能够处理 FormData。
  
  // 临时方案：直接在这里使用 fetch，复用 fetchApi 的 URL 和 Auth 逻辑
  const API_BASE_URL = 'https://api.ancientpath.dpdns.org';
  const url = `${API_BASE_URL}/api/upload`;
  const token = localStorage.getItem('authToken');
  
  const headers: HeadersInit = {};
  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
      method: 'PUT',
      body: formData,
      headers: headers
  });

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '无法解析错误信息' }));
      throw new Error(errorData.message || `上传失败: ${response.status}`);
  }

  const result = await response.json();
  return result.url;
};
