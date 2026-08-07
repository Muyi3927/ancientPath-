import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { 
  registerForPushNotifications, 
  checkNotificationPermission, 
  isNotificationEnabled,
  setNotificationEnabled,
  getLastCheckTime,
  checkForNewPosts 
} from '../services/notificationService';

export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [notificationEnabled, setNotificationEnabledState] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const permission = await checkNotificationPermission();
    const enabled = await isNotificationEnabled();
    const lastCheck = await getLastCheckTime();
    
    setHasPermission(permission);
    setNotificationEnabledState(enabled);
    setLastCheckTime(lastCheck);
  };

  const handleRequestPermission = async () => {
    const granted = await registerForPushNotifications();
    if (granted) {
      Alert.alert('成功', '通知权限已开启');
      setHasPermission(true);
      setNotificationEnabledState(true);
    } else {
      Alert.alert(
        '权限被拒绝',
        '您需要在系统设置中手动开启通知权限',
        [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => {
            // 在实际应用中，这里应该打开系统设置
            Alert.alert('提示', '请在系统设置 > 访问古道 > 通知中开启权限');
          }}
        ]
      );
    }
  };

  const handleToggleNotification = async (value: boolean) => {
    if (!hasPermission && value) {
      await handleRequestPermission();
      return;
    }
    
    setNotificationEnabledState(value);
    await setNotificationEnabled(value);
    
    if (value) {
      Alert.alert('已启用', '您将收到新讲道发布的通知');
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await checkForNewPosts();
      const newLastCheck = await getLastCheckTime();
      setLastCheckTime(newLastCheck);
      Alert.alert('检查完成', '已检查最新讲道');
    } catch (error) {
      Alert.alert('检查失败', '请稍后再试');
    } finally {
      setChecking(false);
    }
  };

  const formatLastCheckTime = (timestamp: number | null) => {
    if (!timestamp) return '从未';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return `${days} 天前`;
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: '通知设置',
          headerBackTitle: '返回',
          headerTintColor: '#2563eb',
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerTitleStyle: { color: isDark ? '#fff' : '#000' },
        }} 
      />
      
      <ScrollView className="flex-1 bg-slate-100 dark:bg-black">
        {/* Header Card */}
        <View className="m-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <View className="flex-row items-center mb-2">
            <IconSymbol name="bell.fill" size={24} color="#2563eb" />
            <Text className="text-xl font-bold text-slate-900 dark:text-white ml-2">
              新讲道通知
            </Text>
          </View>
          <Text className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            启用后，当有新讲道发布时，您将收到推送通知
          </Text>
        </View>

        {/* Permission Status */}
        <View className="mx-4 mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">
              通知权限
            </Text>
            <View className={`px-3 py-1 rounded-full ${hasPermission ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Text className={`text-xs font-medium ${hasPermission ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {hasPermission ? '已授权' : '未授权'}
              </Text>
            </View>
          </View>
          
          {!hasPermission && (
            <TouchableOpacity
              onPress={handleRequestPermission}
              className="mt-2 bg-blue-600 dark:bg-blue-500 rounded-lg p-3 items-center active:bg-blue-700"
            >
              <Text className="text-white font-semibold">请求通知权限</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Toggle */}
        <View className="mx-4 mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                启用通知
              </Text>
              <Text className="text-xs text-slate-600 dark:text-slate-400">
                接收新讲道发布的推送通知
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={handleToggleNotification}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={notificationEnabled ? '#fff' : '#f3f4f6'}
              ios_backgroundColor="#d1d5db"
            />
          </View>
        </View>

        {/* Last Check Info */}
        <View className="mx-4 mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">
              最后检查
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-400">
              {formatLastCheckTime(lastCheckTime)}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleCheckNow}
            disabled={checking || !notificationEnabled}
            className={`mt-2 rounded-lg p-3 items-center ${
              checking || !notificationEnabled 
                ? 'bg-gray-300 dark:bg-gray-700' 
                : 'bg-blue-600 dark:bg-blue-500 active:bg-blue-700'
            }`}
          >
            <Text className={`font-semibold ${
              checking || !notificationEnabled 
                ? 'text-gray-500 dark:text-gray-400' 
                : 'text-white'
            }`}>
              {checking ? '检查中...' : '立即检查新讲道'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View className="mx-4 mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <View className="flex-row items-start">
            <IconSymbol name="info.circle.fill" size={20} color="#f59e0b" />
            <View className="flex-1 ml-2">
              <Text className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                应用会在每次启动时自动检查新讲道。启用通知后，如果有新讲道发布，您会收到推送通知。
              </Text>
              {Platform.OS === 'android' && (
                <Text className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  注意：Android 系统可能会限制后台通知，建议将应用添加到电池优化白名单。
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <View className="mx-4 mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <Text className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-center">
            我们尊重您的隐私。通知功能完全在本地运行，不会收集任何个人信息。
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
