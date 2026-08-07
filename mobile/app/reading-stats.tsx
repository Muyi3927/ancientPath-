// app/reading-stats.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getReadPostIds, getReadingProgress, getPostViewCounts } from '../services/readingHistory';
import { getFavorites } from '../services/favoriteService';
import { getPosts, getCategories, getCachedPosts } from '../services/api';
import { BlogPost, Category } from '../types';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReadingStat {
  totalRead: number;
  totalFavorites: number;
  favoriteCategory: string;
  recentPosts: BlogPost[];
}

export default function ReadingStatsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [stats, setStats] = useState<ReadingStat>({
    totalRead: 0,
    totalFavorites: 0,
    favoriteCategory: '暂无',
    recentPosts: []
  });
  
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadStats();
  }, []);
  
  const loadStats = async () => {
    try {
      // 加载基础数据
      const [readIds, favoriteIds, cats, viewCounts] = await Promise.all([
        getReadPostIds(),
        getFavorites(),
        getCategories(),
        getPostViewCounts()
      ]);
      
      // 尝试从缓存加载，否则从网络获取
      let posts = await getCachedPosts();
      if (!posts || posts.length === 0) {
        posts = await getPosts();
      }
      
      setAllPosts(posts);
      setCategories(cats);
      
      // 获取已读文章
      const readPosts = posts.filter(p => readIds.includes(p.id));
      
      // 统计最喜欢的分类（按点击/阅读次数排序）
      const categoryCounts: { [key: number]: number } = {};
      
      // 遍历所有有点击记录的文章
      Object.entries(viewCounts).forEach(([postIdStr, count]) => {
        const postId = Number(postIdStr);
        const post = posts.find(p => p.id === postId);
        if (post && post.categoryId) {
           categoryCounts[post.categoryId] = (categoryCounts[post.categoryId] || 0) + Number(count);
        }
      });
      
      // 如果没有点击记录，回退到使用已读记录
      if (Object.keys(categoryCounts).length === 0) {
        readPosts.forEach(post => {
          if (post.categoryId) {
            categoryCounts[post.categoryId] = (categoryCounts[post.categoryId] || 0) + 1;
          }
        });
      }
      
      const favoriteCategoryId = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];
      const favoriteCategory = favoriteCategoryId 
        ? cats.find(c => c.id === Number(favoriteCategoryId))?.name || '暂无'
        : '暂无';
      
      // 获取最近阅读的5篇文章（保持阅读历史顺序，最新的在前）
      const recentPostIds = [...readIds].reverse().slice(0, 5);
      const recentPosts = recentPostIds
        .map(id => posts.find(p => p.id === id))
        .filter((p): p is BlogPost => p !== undefined);
      
      setStats({
        totalRead: readIds.length,
        totalFavorites: favoriteIds.length,
        favoriteCategory,
        recentPosts
      });
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderRecentPost = ({ item }: { item: BlogPost }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-900 p-3 mb-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-row active:opacity-70"
      onPress={() => router.push(`/post/${item.id}`)}
    >
      {item.coverImage && (
        <View className="w-20 h-20 rounded-lg overflow-hidden mr-3">
          <Image 
            source={{ uri: item.coverImage }} 
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-900 dark:text-white mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: '我的阅读',
          headerBackTitle: '返回',
          headerTintColor: '#2563eb',
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerTitleStyle: { color: isDark ? '#fff' : '#000' },
        }} 
      />
      <ScrollView className="flex-1 bg-slate-100 dark:bg-black">
        {/* Header */}
        <View className="bg-gradient-to-r bg-blue-600 dark:bg-blue-700 px-6 py-8">
          <View className="items-center">
            <IconSymbol name="book.fill" size={48} color="white" />
            <Text className="text-white text-2xl font-bold mt-3">我的阅读统计</Text>
            <Text className="text-white/80 text-sm mt-1">记录你的阅读足迹</Text>
          </View>
        </View>
        
        {/* Stats Cards */}
        <View className="px-4 -mt-6 mb-4">
          <View className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-4">
            <View className="flex-row flex-wrap">
              {/* 已读讲道 */}
              <View className="w-1/2 p-3 items-center border-r border-b border-slate-100 dark:border-slate-800">
                <IconSymbol name="checkmark.circle.fill" size={32} color="#22c55e" />
                <Text className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalRead}</Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">已读讲道</Text>
              </View>
              
              {/* 收藏讲道 */}
              <TouchableOpacity 
                className="w-1/2 p-3 items-center border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/50"
                onPress={() => router.push('/favorites')}
              >
                <IconSymbol name="heart.fill" size={32} color="#ef4444" />
                <Text className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalFavorites}</Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">收藏讲道 ›</Text>
              </TouchableOpacity>
              
              {/* 最喜欢的分类 */}
              <View className="w-1/2 p-3 items-center">
                <IconSymbol name="star.fill" size={32} color="#f59e0b" />
                <Text className="text-lg font-bold text-slate-900 dark:text-white mt-2" numberOfLines={1}>
                  {stats.favoriteCategory}
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">最喜欢的分类</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* 成就徽章 */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">阅读成就</Text>
          <View className="flex-row flex-wrap">
            {stats.totalRead >= 1 && (
              <View className="bg-white dark:bg-slate-900 rounded-xl p-4 mr-3 mb-3 items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                <IconSymbol name="medal.fill" size={40} color="#fbbf24" />
                <Text className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">初次阅读</Text>
              </View>
            )}
            {stats.totalRead >= 10 && (
              <View className="bg-white dark:bg-slate-900 rounded-xl p-4 mr-3 mb-3 items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                <IconSymbol name="star.fill" size={40} color="#60a5fa" />
                <Text className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">勤奋读者</Text>
              </View>
            )}
            {stats.totalRead >= 50 && (
              <View className="bg-white dark:bg-slate-900 rounded-xl p-4 mr-3 mb-3 items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                <IconSymbol name="crown.fill" size={40} color="#f59e0b" />
                <Text className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">阅读大师</Text>
              </View>
            )}
            {stats.totalFavorites >= 5 && (
              <View className="bg-white dark:bg-slate-900 rounded-xl p-4 mr-3 mb-3 items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                <IconSymbol name="heart.fill" size={40} color="#ef4444" />
                <Text className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">收藏家</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* 最近阅读 */}
        {stats.recentPosts.length > 0 && (
          <View className="px-4 mb-6">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">最近阅读的讲道</Text>
            <FlatList
              data={stats.recentPosts}
              renderItem={renderRecentPost}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}
        
        <View className="h-10" />
      </ScrollView>
    </>
  );
}
