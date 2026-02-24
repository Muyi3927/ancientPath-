import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, Trash2 } from 'lucide-react';
import { getCacheStats, clearCache, refreshAllCache } from '../services/api';

interface CacheManagerProps {
  className?: string;
}

export const CacheManager: React.FC<CacheManagerProps> = ({ className = '' }) => {
  const [stats, setStats] = useState({ memorySize: 0, localStorageSize: 0, sessionStorageSize: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const updateStats = () => {
    setStats(getCacheStats());
  };

  useEffect(() => {
    updateStats();
    // 定期更新统计信息
    const interval = setInterval(updateStats, 30000); // 30秒
    return () => clearInterval(interval);
  }, []);

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllCache();
      updateStats();
    } catch (error) {
      console.error('刷新缓存失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = (type: 'posts' | 'categories' | 'all') => {
    if (confirm(`确定要清除${type === 'all' ? '所有' : type}缓存吗？`)) {
      clearCache(type);
      updateStats();
    }
  };

  const totalCacheSize = stats.memorySize + stats.localStorageSize + stats.sessionStorageSize;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 简洁状态指示器 */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2">
          <Database size={16} className="text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            缓存: {totalCacheSize} 项
          </span>
          {totalCacheSize > 0 && (
            <div className="w-2 h-2 bg-green-400 rounded-full" title="缓存活跃"></div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="显示详情"
          >
            <Clock size={14} />
          </button>
          <button
            onClick={handleRefreshCache}
            disabled={isRefreshing}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
            title="刷新缓存"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 详细信息面板 */}
      {showDetails && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* 缓存统计 */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-white">{stats.memorySize}</div>
              <div className="text-gray-500">内存缓存</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-white">{stats.localStorageSize}</div>
              <div className="text-gray-500">本地存储</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-white">{stats.sessionStorageSize}</div>
              <div className="text-gray-500">会话存储</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleClearCache('posts')}
              className="flex-1 text-xs px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded"
            >
              清除文章
            </button>
            <button
              onClick={() => handleClearCache('categories')}
              className="flex-1 text-xs px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded"
            >
              清除分类
            </button>
            <button
              onClick={() => handleClearCache('all')}
              className="flex-1 text-xs px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded"
            >
              <Trash2 size={12} className="inline mr-1" />
              全部清除
            </button>
          </div>

          {/* 缓存说明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 缓存可以大幅提升页面加载速度</p>
            <p>• 数据更新时会自动清除相关缓存</p>
            <p>• 过期缓存会在后台自动更新</p>
          </div>
        </div>
      )}
    </div>
  );
};

// 简化的缓存状态指示器，用于页面角落
export const CacheIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [cacheActive, setCacheActive] = useState(false);

  useEffect(() => {
    const checkCache = () => {
      const stats = getCacheStats();
      setCacheActive(stats.memorySize > 0 || stats.localStorageSize > 0);
    };

    checkCache();
    const interval = setInterval(checkCache, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!cacheActive) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`} title="缓存活跃">
      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      <span className="text-xs text-green-600 dark:text-green-400">已缓存</span>
    </div>
  );
};