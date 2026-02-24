import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { AppOwnership } from 'expo-constants'; // 引入常量检查环境
import { getPosts } from './api';

// 动态类型定义
let Notifications: typeof import('expo-notifications') | null = null;
let isNotificationsAvailable = true;

/**
 * 安全获取通知模块
 * 核心逻辑：在 Android + Expo Go 环境下直接拦截，不执行 require
 */
function getNotifications() {
  if (!isNotificationsAvailable) return null;
  if (Notifications) return Notifications;
  
  try {
    // 检查是否运行在 Expo Go 中
    const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

    // SDK 53+ 在 Android Expo Go 中彻底移除了原生推送代码
    if (Platform.OS === 'android' && isExpoGo) {
      console.warn('检测到 Android Expo Go 环境：SDK 53 之后不再支持远程通知。请使用 Development Build 进行测试。');
      isNotificationsAvailable = false;
      return null;
    }

    Notifications = require('expo-notifications');
    return Notifications;
  } catch (e) {
    console.warn('无法加载 expo-notifications 模块:', e);
    isNotificationsAvailable = false;
    return null;
  }
}

const LAST_CHECK_KEY = 'notification_last_check';
const LAST_POST_ID_KEY = 'notification_last_post_id';
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';

/**
 * 初始化通知服务
 */
export function initializeNotifications(): void {
  const notifications = getNotifications();
  if (!notifications) return;

  try {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('设置通知处理器失败:', e);
  }
}

/**
 * 请求通知权限
 */
export async function registerForPushNotifications(): Promise<boolean> {
  const notifications = getNotifications();
  
  if (!notifications) {
    // 如果是 Android Expo Go，给用户一个明确提示
    if (Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo) {
      Alert.alert('环境受限', 'Android Expo Go 不支持通知功能。请切换至开发构建 (Development Build) 或正式版测试。');
    }
    return false;
  }
  
  if (!Device.isDevice) {
    Alert.alert('提示', '推送通知仅在真实设备上可用');
    return false;
  }

  try {
    const { status: existingStatus } = await notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // 设置通知渠道 (Android)
    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync('default', {
        name: '新讲道通知',
        importance: notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
        sound: 'default',
      });
    }

    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
    return true;
  } catch (error) {
    console.error('请求通知权限失败:', error);
    return false;
  }
}

/**
 * 检查通知权限状态
 */
export async function checkNotificationPermission(): Promise<boolean> {
  const notifications = getNotifications();
  if (!notifications) return false;
  
  try {
    const { status } = await notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('检查通知权限失败:', error);
    return false;
  }
}

/**
 * 检查是否启用了通知
 */
export async function isNotificationEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * 启用/禁用通知
 */
export async function setNotificationEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('设置通知状态失败:', error);
  }
}

/**
 * 检查新讲道并发送通知
 */
export async function checkForNewPosts(): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;

  try {
    const enabled = await isNotificationEnabled();
    if (!enabled) return;

    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return;

    const posts = await getPosts();
    if (posts.length === 0) return;

    const publishedPosts = posts.filter(p => !p.tags.includes('__draft__'));
    if (publishedPosts.length === 0) return;

    const sortedPosts = publishedPosts.sort((a, b) => b.createdAt - a.createdAt);
    const latestPost = sortedPosts[0];

    const lastPostId = await AsyncStorage.getItem(LAST_POST_ID_KEY);
    
    if (lastPostId !== String(latestPost.id)) {
      await sendNewPostNotification(latestPost);
      await AsyncStorage.setItem(LAST_POST_ID_KEY, String(latestPost.id));
    }

    await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  } catch (error) {
    console.error('检查新讲道失败:', error);
  }
}

/**
 * 发送新讲道通知
 */
async function sendNewPostNotification(post: any): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;
  
  try {
    await notifications.scheduleNotificationAsync({
      content: {
        title: '📝 新讲道发布',
        body: post.title,
        data: { postId: post.id, type: 'new_post' },
        sound: true,
        badge: 1,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('发送通知失败:', error);
  }
}

/**
 * 获取最后检查时间
 */
export async function getLastCheckTime(): Promise<number | null> {
  try {
    const time = await AsyncStorage.getItem(LAST_CHECK_KEY);
    return time ? parseInt(time, 10) : null;
  } catch (error) {
    return null;
  }
}

/**
 * 清除所有通知
 */
export async function clearAllNotifications(): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;
  
  try {
    await notifications.dismissAllNotificationsAsync();
    await notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('清除通知失败:', error);
  }
}

/**
 * 设置通知响应处理
 */
export function setupNotificationResponseHandler(onNotificationPress: (postId: number) => void): () => void {
  const notifications = getNotifications();
  if (!notifications) return () => {};
  
  const subscription = notifications.addNotificationResponseReceivedListener(response => {
    const postId = response.notification.request.content.data?.postId;
    if (postId) {
      onNotificationPress(Number(postId));
    }
  });

  return () => subscription.remove();
}