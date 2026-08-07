import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_POSTS_KEY = 'read_posts_ids';
const POST_VIEWS_KEY = 'post_views_count';
const PROGRESS_PREFIX = 'reading_progress_';

export const incrementPostView = async (postId: number) => {
  try {
    const existing = await AsyncStorage.getItem(POST_VIEWS_KEY);
    const counts: Record<number, number> = existing ? JSON.parse(existing) : {};
    counts[postId] = (counts[postId] || 0) + 1;
    await AsyncStorage.setItem(POST_VIEWS_KEY, JSON.stringify(counts));
  } catch (e) {
    console.error('Failed to increment post view', e);
  }
};

export const getPostViewCounts = async (): Promise<Record<number, number>> => {
  try {
    const existing = await AsyncStorage.getItem(POST_VIEWS_KEY);
    return existing ? JSON.parse(existing) : {};
  } catch (e) {
    return {};
  }
};

export const markPostAsRead = async (postId: number) => {
  try {
    const existing = await AsyncStorage.getItem(READ_POSTS_KEY);
    let ids: number[] = existing ? JSON.parse(existing) : [];
    
    // 如果已存在，先移除旧位置的记录，确保最近阅读的排在最后
    ids = ids.filter(id => id !== postId);
    ids.push(postId);
    
    await AsyncStorage.setItem(READ_POSTS_KEY, JSON.stringify(ids));
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
