// services/highlightService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGHLIGHTS_KEY = 'post_highlights';

export interface Highlight {
  id: string;
  postId: number;
  text: string;
  color: string;
  timestamp: number;
}

/**
 * 获取某篇文章的所有高亮
 */
export async function getHighlights(postId: number): Promise<Highlight[]> {
  try {
    const key = `${HIGHLIGHTS_KEY}_${postId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取高亮失败', error);
    return [];
  }
}

/**
 * 添加高亮
 */
export async function addHighlight(postId: number, text: string, color: string = '#fef08a'): Promise<void> {
  try {
    const highlights = await getHighlights(postId);
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      postId,
      text,
      color,
      timestamp: Date.now()
    };
    highlights.push(newHighlight);
    
    const key = `${HIGHLIGHTS_KEY}_${postId}`;
    await AsyncStorage.setItem(key, JSON.stringify(highlights));
  } catch (error) {
    console.error('添加高亮失败', error);
    throw error;
  }
}

/**
 * 删除高亮
 */
export async function removeHighlight(postId: number, highlightId: string): Promise<void> {
  try {
    const highlights = await getHighlights(postId);
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    
    const key = `${HIGHLIGHTS_KEY}_${postId}`;
    await AsyncStorage.setItem(key, JSON.stringify(updatedHighlights));
  } catch (error) {
    console.error('删除高亮失败', error);
    throw error;
  }
}

/**
 * 清空某篇文章的所有高亮
 */
export async function clearHighlights(postId: number): Promise<void> {
  try {
    const key = `${HIGHLIGHTS_KEY}_${postId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('清空高亮失败', error);
    throw error;
  }
}
