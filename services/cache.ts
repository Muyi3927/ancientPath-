// services/cache.ts - Web缓存服务
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  etag?: string; // 用于HTTP缓存验证
}

export interface CacheConfig {
  maxAge: number; // 缓存有效期 (毫秒)
  staleWhileRevalidate: number; // 过期后仍可使用的时间，同时后台更新 (毫秒)
  storage: 'memory' | 'localStorage' | 'sessionStorage';
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 5 * 60 * 1000, // 5分钟
  staleWhileRevalidate: 30 * 60 * 1000, // 30分钟
  storage: 'localStorage'
};

class WebCache {
  private memoryCache = new Map<string, CacheItem<any>>();
  private backgroundUpdates = new Set<string>();

  private getStorage(storage: CacheConfig['storage']): Storage | null {
    switch (storage) {
      case 'localStorage':
        return localStorage;
      case 'sessionStorage':
        return sessionStorage;
      case 'memory':
        return null;
    }
  }

  private getCacheKey(key: string): string {
    return `blog_cache_${key}`;
  }

  // 获取缓存项
  private getCacheItem<T>(key: string, config: CacheConfig): CacheItem<T> | null {
    const cacheKey = this.getCacheKey(key);
    
    // 优先从内存缓存获取
    if (config.storage === 'memory' || this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey) || null;
    }

    // 从持久化存储获取
    const storage = this.getStorage(config.storage);
    if (!storage) return null;

    try {
      const item = storage.getItem(cacheKey);
      if (!item) return null;
      
      const parsed = JSON.parse(item) as CacheItem<T>;
      // 同时存入内存缓存以提升性能
      this.memoryCache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      console.warn(`获取缓存失败 ${key}:`, error);
      return null;
    }
  }

  // 设置缓存项
  private setCacheItem<T>(key: string, data: T, config: CacheConfig, etag?: string): void {
    const cacheKey = this.getCacheKey(key);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      etag
    };

    // 设置内存缓存
    this.memoryCache.set(cacheKey, item);

    // 设置持久化存储
    if (config.storage !== 'memory') {
      const storage = this.getStorage(config.storage);
      if (storage) {
        try {
          storage.setItem(cacheKey, JSON.stringify(item));
        } catch (error) {
          console.warn(`设置缓存失败 ${key}:`, error);
          // 如果存储空间满了，清理一些旧缓存
          this.clearExpiredCache(config.storage);
        }
      }
    }
  }

  // 检查缓存是否有效
  private isCacheValid(item: CacheItem<any>, config: CacheConfig): boolean {
    const age = Date.now() - item.timestamp;
    return age < config.maxAge;
  }

  // 检查是否可以使用过期缓存
  private isStaleUsable(item: CacheItem<any>, config: CacheConfig): boolean {
    const age = Date.now() - item.timestamp;
    return age < config.maxAge + config.staleWhileRevalidate;
  }

  // 清理过期缓存
  private clearExpiredCache(storage: 'localStorage' | 'sessionStorage'): void {
    const storageObj = this.getStorage(storage);
    if (!storageObj) return;

    try {
      const keys = Object.keys(storageObj);
      const blogCacheKeys = keys.filter(k => k.startsWith('blog_cache_'));
      
      for (const key of blogCacheKeys) {
        try {
          const item = JSON.parse(storageObj.getItem(key) || '');
          const age = Date.now() - item.timestamp;
          // 清理超过1天的缓存
          if (age > 24 * 60 * 60 * 1000) {
            storageObj.removeItem(key);
          }
        } catch (e) {
          // 无法解析的也删除
          storageObj.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('清理缓存失败:', error);
    }
  }

  // 主要的缓存获取方法
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const cached = this.getCacheItem<T>(key, fullConfig);

    // 如果有有效缓存，直接返回
    if (cached && this.isCacheValid(cached, fullConfig)) {
      return cached.data;
    }

    // 如果有过期但可用的缓存，返回缓存同时后台更新
    if (cached && this.isStaleUsable(cached, fullConfig)) {
      // 后台更新 (不阻塞当前请求)
      if (!this.backgroundUpdates.has(key)) {
        this.backgroundUpdates.add(key);
        fetcher()
          .then(data => {
            this.setCacheItem(key, data, fullConfig);
            this.backgroundUpdates.delete(key);
          })
          .catch(error => {
            console.warn(`后台更新缓存失败 ${key}:`, error);
            this.backgroundUpdates.delete(key);
          });
      }
      return cached.data;
    }

    // 没有可用缓存，必须等待新数据
    try {
      const data = await fetcher();
      this.setCacheItem(key, data, fullConfig);
      return data;
    } catch (error) {
      // 如果请求失败，但有过期缓存，则使用过期缓存
      if (cached) {
        console.warn(`使用过期缓存 ${key}，因为新请求失败:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  // 手动设置缓存
  set<T>(key: string, data: T, config: Partial<CacheConfig> = {}): void {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    this.setCacheItem(key, data, fullConfig);
  }

  // 删除特定缓存
  delete(key: string): void {
    const cacheKey = this.getCacheKey(key);
    
    // 从内存删除
    this.memoryCache.delete(cacheKey);
    
    // 从持久化存储删除
    try {
      localStorage.removeItem(cacheKey);
      sessionStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn(`删除缓存失败 ${key}:`, error);
    }
  }

  // 清除所有缓存
  clear(): void {
    // 清除内存缓存
    this.memoryCache.clear();
    
    // 清除持久化存储中的博客缓存
    this.clearExpiredCache('localStorage');
    this.clearExpiredCache('sessionStorage');
  }

  // 预加载数据
  async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const cached = this.getCacheItem<T>(key, fullConfig);

    // 如果没有缓存或缓存即将过期，预加载
    if (!cached || !this.isCacheValid(cached, fullConfig)) {
      try {
        const data = await fetcher();
        this.setCacheItem(key, data, fullConfig);
      } catch (error) {
        console.warn(`预加载失败 ${key}:`, error);
      }
    }
  }

  // 获取缓存状态信息
  getStats(): {
    memorySize: number;
    localStorageSize: number;
    sessionStorageSize: number;
  } {
    const memorySize = this.memoryCache.size;
    
    const countStorageKeys = (storage: Storage | null) => {
      if (!storage) return 0;
      try {
        return Object.keys(storage).filter(k => k.startsWith('blog_cache_')).length;
      } catch {
        return 0;
      }
    };

    return {
      memorySize,
      localStorageSize: countStorageKeys(localStorage),
      sessionStorageSize: countStorageKeys(sessionStorage)
    };
  }
}

// 创建单例实例
export const webCache = new WebCache();

// 预定义的缓存配置
export const CacheConfigs = {
  // 博客文章列表 - 中等缓存时间
  posts: {
    maxAge: 3 * 60 * 1000, // 3分钟
    staleWhileRevalidate: 15 * 60 * 1000, // 15分钟
    storage: 'localStorage' as const
  },
  
  // 分类列表 - 较长缓存时间（分类变化不频繁）
  categories: {
    maxAge: 10 * 60 * 1000, // 10分钟
    staleWhileRevalidate: 60 * 60 * 1000, // 1小时
    storage: 'localStorage' as const
  },
  
  // 单篇文章 - 较长缓存时间
  post: {
    maxAge: 10 * 60 * 1000, // 10分钟
    staleWhileRevalidate: 30 * 60 * 1000, // 30分钟
    storage: 'localStorage' as const
  },

  // 用户偏好设置 - 仅内存缓存
  preferences: {
    maxAge: 60 * 60 * 1000, // 1小时
    staleWhileRevalidate: 24 * 60 * 60 * 1000, // 24小时
    storage: 'sessionStorage' as const
  }
} as const;