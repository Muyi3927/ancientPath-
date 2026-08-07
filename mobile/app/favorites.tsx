import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { getPosts, getCachedPosts } from '../services/api';
import { getFavorites } from '../services/favoriteService';
import { BlogPost } from '../types';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function FavoritesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [favoritePosts, setFavoritePosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const favoriteIds = await getFavorites();
      
      let posts = await getCachedPosts();
      if (!posts || posts.length === 0) {
        posts = await getPosts();
      }

      const filtered = posts.filter(p => favoriteIds.includes(p.id));
      // Sort by favorites? Usually user expects LIFO, but here we just show filtered list.
      // Or maybe sort by reversed favoriteIds if we stored them in order?
      // getFavorites returns number[] which is stored as pushed, so reversing it gives LIFO
      
      const orderedFavorites = [...favoriteIds].reverse()
        .map(id => filtered.find(p => p.id === id))
        .filter((p): p is BlogPost => p !== undefined);

      setFavoritePosts(orderedFavorites);
    } catch (error) {
      console.error('Failed to load favorites', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: BlogPost }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-900 mx-4 mb-3 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <View className="flex-row">
        {item.coverImage && (
          <View className="w-20 h-20 rounded-lg overflow-hidden mr-3 bg-slate-100 dark:bg-slate-800">
            <Image 
              source={{ uri: item.coverImage }} 
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}
        <View className="flex-1 justify-center">
          <Text className="text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-tight" numberOfLines={2}>
            {item.title}
          </Text>
          <View className="flex-row items-center">
             <Text className="text-xs text-slate-500 dark:text-slate-400 mr-2">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
             {item.tags && item.tags.length > 0 && (
                <View className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  <Text className="text-[10px] text-slate-600 dark:text-slate-300">{item.tags[0]}</Text>
                </View>
             )}
          </View>
        </View>
        <View className="justify-center pl-2">
            <IconSymbol name="chevron.right" size={20} color={isDark ? '#4b5563' : '#9ca3af'} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: '我的收藏',
          headerBackTitle: '返回',
          headerTintColor: '#2563eb',
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerTitleStyle: { color: isDark ? '#fff' : '#000' },
        }} 
      />
      <View className="flex-1 bg-slate-100 dark:bg-black pt-4">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : favoritePosts.length > 0 ? (
          <FlatList
            data={favoritePosts}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        ) : (
          <View className="flex-1 items-center justify-center -mt-20">
            <IconSymbol name="heart" size={64} color={isDark ? '#334155' : '#cbd5e1'} />
            <Text className="text-slate-500 dark:text-slate-400 mt-4 text-lg">暂无收藏</Text>
            <Text className="text-slate-400 dark:text-slate-500 mt-2 text-sm">在讲道详情页点击爱心即可收藏</Text>
          </View>
        )}
      </View>
    </>
  );
}
