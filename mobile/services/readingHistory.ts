import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_POSTS_KEY = 'read_posts_ids';
const PROGRESS_PREFIX = 'reading_progress_';

export const markPostAsRead = async (postId: number) => {
  try {
    const existing = await AsyncStorage.getItem(READ_POSTS_KEY);
    const ids = existing ? JSON.parse(existing) : [];
    if (!ids.includes(postId)) {
      ids.push(postId);
      await AsyncStorage.setItem(READ_POSTS_KEY, JSON.stringify(ids));
    }
  } catch (e) {
    console.error('Failed to mark post as read', e);
  }
};

export const getReadPostIds = async (): Promise<number[]> => {
  try {
    const existing = await AsyncStorage.getItem(READ_POSTS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    return [];
  }
};

export const saveReadingProgress = async (postId: number, y: number) => {
  try {
    await AsyncStorage.setItem(`${PROGRESS_PREFIX}${postId}`, y.toString());
  } catch (e) {
    console.error('Failed to save progress', e);
  }
};

export const getReadingProgress = async (postId: number): Promise<number> => {
  try {
    const val = await AsyncStorage.getItem(`${PROGRESS_PREFIX}${postId}`);
    return val ? parseFloat(val) : 0;
  } catch (e) {
    return 0;
  }
};
