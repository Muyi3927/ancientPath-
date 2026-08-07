// services/searchService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'blog_search_history';
const MAX_SEARCH_HISTORY = 10;

/**
 * 保存搜索历史
 */
export async function saveSearchHistory(query: string): Promise<void> {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    const history: string[] = historyJson ? JSON.parse(historyJson) : [];
    
    // 去重并添加到开头
    const updatedHistory = [
      trimmedQuery,
      ...history.filter(item => item !== trimmedQuery)
    ].slice(0, MAX_SEARCH_HISTORY);
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('保存搜索历史失败', error);
  }
}

/**
 * 获取搜索历史
 */
export async function getSearchHistory(): Promise<string[]> {
  try {
    const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('获取搜索历史失败', error);
    return [];
  }
}

/**
 * 删除单个搜索历史
 */
export async function removeSearchHistoryItem(query: string): Promise<void> {
  try {
    const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    const history: string[] = historyJson ? JSON.parse(historyJson) : [];
    const updatedHistory = history.filter(item => item !== query);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('删除搜索历史失败', error);
  }
}

/**
 * 清空所有搜索历史
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('清空搜索历史失败', error);
  }
}
