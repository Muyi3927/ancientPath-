// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlogPost, Category } from '../types';

// Use the production URL for simplicity.
// In development, if you want to use local backend, use your LAN IP (e.g. http://192.168.1.x:8787)
// or Android Emulator host IP (http://10.0.2.2:8787).
export const API_BASE_URL = 'https://api.ancientpath.dpdns.org';

/**
 * 统一处理 API 请求的函数
 * @param endpoint API 的路径 (例如 /api/posts)
 * @param options fetch 函数的配置选项
 * @returns Promise<T>
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 从 AsyncStorage 获取 Token
  const token = await AsyncStorage.getItem('authToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }

  // 设置 60 秒超时，以应对冷启动
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '无法解析错误信息' }));
      console.log(`API Error: ${response.status} ${response.statusText}`, errorData);
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
  } catch (error: any) {
    // 忽略 AbortError (超时)，让上层函数去处理缓存回退
    if (error.name === 'AbortError' || error.message === 'Aborted') {
        console.log(`Request timed out: ${url}`);
        throw error;
    }
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

// ==================== 缓存辅助函数 ====================

const CACHE_PREFIX = 'blog_cache_';

const getCacheKey = (key: string) => `${CACHE_PREFIX}${key}`;

const saveToCache = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(getCacheKey(key), JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to cache', e);
  }
};

const getFromCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await AsyncStorage.getItem(getCacheKey(key));
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to read from cache', e);
    return null;
  }
};

// ==================== API 函数 ====================

// 导出缓存读取函数，以便 UI 可以实现"缓存优先"策略
export const getCachedPosts = async (categoryId?: number, search?: string): Promise<BlogPost[] | null> => {
    const cacheKey = `posts_${categoryId ?? 'all'}_${search ?? 'none'}`;
    return getFromCache<BlogPost[]>(cacheKey);
};

export const getCachedCategories = async (): Promise<Category[] | null> => {
    return getFromCache<Category[]>('categories');
};

// 获取所有文章
export const getPosts = async (categoryId?: number, search?: string): Promise<BlogPost[]> => {
    let url = '/api/posts';
    const params = new URLSearchParams();
    // Explicitly check for undefined/null to allow categoryId=0 if needed (though IDs usually start at 1)
    if (categoryId !== undefined && categoryId !== null) {
        params.append('categoryId', categoryId.toString());
    }
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }
    
    const cacheKey = `posts_${categoryId ?? 'all'}_${search ?? 'none'}`;

    try {
        console.log(`Fetching posts from: ${url}`); // Debug log
        const data = await fetchApi<any[]>(url);
        const posts = data.map(transformPost);
        // 成功获取后更新缓存
        saveToCache(cacheKey, posts);
        return posts;
    } catch (error) {
        console.log('Network request failed, trying cache for posts...');
        // 网络请求失败，尝试读取缓存
        const cached = await getFromCache<BlogPost[]>(cacheKey);
        if (cached) {
            return cached;
        }
        throw error;
    }
};

// 根据 ID 获取单篇文章
export const getPostById = async (id: number): Promise<BlogPost> => {
    const cacheKey = `post_${id}`;
    try {
        const post = await fetchApi<any>(`/api/posts/${id}`);
        const transformed = transformPost(post);
        saveToCache(cacheKey, transformed);
        return transformed;
    } catch (error) {
        console.log(`Network request failed for post ${id}, trying cache...`);
        const cached = await getFromCache<BlogPost>(cacheKey);
        if (cached) return cached;
        throw error;
    }
};

// 获取所有分类
export const getCategories = async (): Promise<Category[]> => {
    const cacheKey = 'categories';
    try {
        const cats = await fetchApi<any[]>('/api/categories');
        const transformed = cats.map(transformCategory);
        saveToCache(cacheKey, transformed);
        return transformed;
    } catch (error) {
        console.log('Network request failed for categories, trying cache...');
        const cached = await getFromCache<Category[]>(cacheKey);
        if (cached) return cached;
        throw error;
    }
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

// 上传文件 (React Native 需要专门的实现，暂时禁用)
export const uploadFile = async (file: any): Promise<string> => {
  console.warn("File upload not implemented for React Native yet.");
  throw new Error("File upload not implemented");
  /*
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type
  } as any);

  const url = `${API_BASE_URL}/api/upload`;
  const token = await AsyncStorage.getItem('authToken');
  
  const headers: HeadersInit = {};
  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
      method: 'PUT',
      body: formData,
      headers: headers
  });
  // ...
  */
};
