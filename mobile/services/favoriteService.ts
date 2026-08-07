// services/favoriteService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'blog_favorites';

/**
 * 获取所有收藏的文章ID
 */
export async function getFavorites(): Promise<number[]> {
  try {
    const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
    return favoritesJson ? JSON.parse(favoritesJson) : [];
  } catch (error) {
    console.error('获取收藏列表失败', error);
    return [];
  }
}

/**
 * 检查文章是否已收藏
 */
export async function isFavorite(postId: number): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(postId);
}

/**
 * 添加收藏
 */
export async function addFavorite(postId: number): Promise<void> {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(postId)) {
      favorites.push(postId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('添加收藏失败', error);
    throw error;
  }
}

/**
 * 取消收藏
 */
export async function removeFavorite(postId: number): Promise<void> {
  try {
    const favorites = await getFavorites();
    const updatedFavorites = favorites.filter(id => id !== postId);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
  } catch (error) {
    console.error('取消收藏失败', error);
    throw error;
  }
}

/**
 * 切换收藏状态
 */
export async function toggleFavorite(postId: number): Promise<boolean> {
  const favorites = await getFavorites();
  if (favorites.includes(postId)) {
    await removeFavorite(postId);
    return false;
  } else {
    await addFavorite(postId);
    return true;
  }
}
