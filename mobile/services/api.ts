// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlogPost, Category } from '../types';

// Use the production URL for simplicity.
// In development, if you want to use local backend, use your LAN IP (e.g. http://192.168.1.x:8787)
// or Android Emulator host IP (http://10.0.2.2:8787).
export const API_BASE_URL = 'https://api.ancientpath.dpdns.org';

/**
 * 测试 API 连接性
 */
export async function testApiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { success: true, message: `API 连接正常 (${response.status})` };
    } else {
      return { 
        success: false, 
        message: `API 返回错误状态: ${response.status} ${response.statusText}` 
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, message: '连接超时，请检查网络' };
    }
    return { 
      success: false, 
      message: `网络错误: ${error.message}` 
    };
  }
}

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

  console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

  // 设置 60 秒超时，以应对冷启动
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 尝试获取响应的文本内容以便调试
      let errorText = '';
      let errorData: any = {};
      
      try {
        errorText = await response.text();
        // 尝试解析为 JSON
        if (errorText) {
          errorData = JSON.parse(errorText);
        }
      } catch (parseError) {
        // 如果无法解析为 JSON，使用文本作为消息
        errorData = { message: errorText || '无法解析错误信息' };
      }
      
      console.log(`API Error [${response.status}] ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData
      });
      
      // 对特定错误码提供更有帮助的信息
      if (response.status === 403) {
        // 403 可能是 token 过期，清除它
        if (token) {
          console.log('⚠️ 收到 403 错误，清除可能过期的 token');
          await AsyncStorage.removeItem('authToken');
        }
        throw new Error('访问被拒绝 (403)。如果问题持续，请尝试重新启动应用。');
      }
      if (response.status === 401) {
        // 401 明确是认证问题，清除 token
        await AsyncStorage.removeItem('authToken');
        throw new Error('未授权访问 (401)，请重新登录');
      }
      if (response.status === 404) {
        throw new Error(`资源不存在 (404): ${endpoint}`);
      }
      
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
        console.log(`⏱️ 请求超时: ${url}`);
        throw new Error('请求超时，请检查网络连接');
    }
    
    // 网络错误通常意味着无法连接到服务器
    if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        console.log(`🔌 网络连接失败: ${url}`);
        throw new Error('无法连接到服务器，请检查网络连接');
    }
    
    console.error('❌ API 请求失败:', error);
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
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const getCacheKey = (key: string) => `${CACHE_PREFIX}${key}`;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const saveToCache = async (key: string, data: any) => {
  try {
    const item: CacheItem<any> = {
      data,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(getCacheKey(key), JSON.stringify(item));
  } catch (e) {
    console.warn('Failed to save to cache', e);
  }
};

const getFromCache = async <T>(key: string): Promise<CacheItem<T> | null> => {
  try {
    const json = await AsyncStorage.getItem(getCacheKey(key));
    if (!json) return null;
    
    const parsed = JSON.parse(json);
    // 兼容旧格式 (Legacy support): 如果没有 timestamp 字段，视为旧数据
    if (!parsed.timestamp || parsed.data === undefined) {
      // 旧数据直接返回作为 data，timestamp 设为 0 (强制过期)
      return { data: parsed as T, timestamp: 0 };
    }
    return parsed as CacheItem<T>;
  } catch (e) {
    console.warn('Failed to read from cache', e);
    return null;
  }
};

// ==================== API 函数 ====================

// 导出缓存读取函数，以便 UI 可以实现"缓存优先"策略
export const getCachedPosts = async (categoryId?: number, search?: string): Promise<BlogPost[] | null> => {
    const cacheKey = `posts_${categoryId ?? 'all'}_${search ?? 'none'}`;
    const item = await getFromCache<BlogPost[]>(cacheKey);
    return item ? item.data : null;
};

export const getCachedCategories = async (): Promise<Category[] | null> => {
    const item = await getFromCache<Category[]>('categories');
    return item ? item.data : null;
};

// 获取所有文章
// forceRefresh: 强制从网络获取
export const getPosts = async (categoryId?: number, search?: string, forceRefresh = false): Promise<BlogPost[]> => {
    let url = '/api/posts';
    const params = new URLSearchParams();
    if (categoryId !== undefined && categoryId !== null) {
        params.append('categoryId', categoryId.toString());
    }
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }
    
    const cacheKey = `posts_${categoryId ?? 'all'}_${search ?? 'none'}`;

    // 1. 尝试使用缓存
    if (!forceRefresh) {
      const cached = await getFromCache<BlogPost[]>(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY)) {
          console.log(`✅ 使用缓存 (未过期): ${cacheKey}`);
          return cached.data;
      }
    }

    try {
        const data = await fetchApi<any[]>(url);
        const posts = data.map(transformPost);
        // 成功获取后更新缓存
        saveToCache(cacheKey, posts);
        console.log(`✅ 成功获取 ${posts.length} 篇讲道`);
        return posts;
    } catch (error: any) {
        console.log(`⚠️ 讲道请求失败: ${error.message}，尝试使用缓存...`);
        // 网络请求失败，不管是否过期都尝试读取缓存
        const cached = await getFromCache<BlogPost[]>(cacheKey);
        if (cached) {
            console.log(`✅ 使用缓存 (虽可能过期/强制刷新失败): ${cached.data.length} 篇讲道`);
            return cached.data;
        }
        console.error('❌ 无法获取讲道，且无可用缓存');
        throw error;
    }
};

// 根据 ID 获取单篇讲道
export const getPostById = async (id: number, forceRefresh = false): Promise<BlogPost> => {
    const cacheKey = `post_${id}`;
    
    if (!forceRefresh) {
      const cached = await getFromCache<BlogPost>(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY)) {
          console.log(`✅ 使用缓存讲道 (未过期): ${id}`);
          return cached.data;
      }
    }

    try {
        const post = await fetchApi<any>(`/api/posts/${id}`);
        const transformed = transformPost(post);
        saveToCache(cacheKey, transformed);
        console.log(`✅ 成功获取讲道: ${transformed.title}`);
        return transformed;
    } catch (error: any) {
        console.log(`⚠️ 讲道 ${id} 请求失败: ${error.message}，尝试使用缓存...`);
        const cached = await getFromCache<BlogPost>(cacheKey);
        if (cached) {
            console.log(`✅ 使用缓存的讲道: ${cached.data.title}`);
            return cached.data;
        }
        console.error(`❌ 无法获取讲道 ${id}，且无可用缓存`);
        throw error;
    }
};

// 获取所有分类
export const getCategories = async (forceRefresh = false): Promise<Category[]> => {
    const cacheKey = 'categories';
    
    if (!forceRefresh) {
      const cached = await getFromCache<Category[]>(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY)) {
          console.log(`✅ 使用缓存分类 (未过期)`);
          return cached.data;
      }
    }

    try {
        const cats = await fetchApi<any[]>('/api/categories');
        const transformed = cats.map(transformCategory);
        saveToCache(cacheKey, transformed);
        console.log(`✅ 成功获取 ${transformed.length} 个分类`);
        return transformed;
    } catch (error: any) {
        console.log(`⚠️ 分类请求失败: ${error.message}，尝试使用缓存...`);
        const cached = await getFromCache<Category[]>(cacheKey);
        if (cached) {
            console.log(`✅ 使用缓存的 ${cached.data.length} 个分类`);
            return cached.data;
        }
        console.error('❌ 无法获取分类，且无可用缓存');
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
