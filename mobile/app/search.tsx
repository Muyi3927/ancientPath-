// app/search.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Keyboard, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getPosts } from '../services/api';
import { BlogPost } from '../types';
import { saveSearchHistory, getSearchHistory, removeSearchHistoryItem, clearSearchHistory } from '../services/searchService';
import { Image } from 'expo-image';

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BlogPost[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  
  useEffect(() => {
    loadSearchHistory();
    loadPosts();
  }, []);
  
  const loadSearchHistory = async () => {
    const history = await getSearchHistory();
    setSearchHistory(history);
  };
  
  const loadPosts = async () => {
    try {
      const posts = await getPosts();
      setAllPosts(posts.filter(p => !p.tags.includes('__draft__')));
    } catch (error) {
      console.error('加载讲道失败', error);
    }
  };
  
  const performSearch = async (query?: string) => {
    const searchText = query || searchQuery;
    if (!searchText.trim()) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    Keyboard.dismiss();
    
    try {
      // 客户端搜索
      const lowerQuery = searchText.toLowerCase();
      const results = allPosts.filter(post => 
        post.title.toLowerCase().includes(lowerQuery) ||
        post.excerpt.toLowerCase().includes(lowerQuery) ||
        post.content.toLowerCase().includes(lowerQuery) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
      
      setSearchResults(results);
      await saveSearchHistory(searchText);
      await loadSearchHistory();
    } catch (error) {
      console.error('搜索失败', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleHistoryItemPress = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
  };
  
  const handleRemoveHistoryItem = async (query: string) => {
    await removeSearchHistoryItem(query);
    await loadSearchHistory();
  };
  
  const handleClearHistory = async () => {
    await clearSearchHistory();
    await loadSearchHistory();
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };
  
  const renderSearchResult = ({ item }: { item: BlogPost }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-900 p-4 mb-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 active:opacity-70"
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <View className="flex-row">
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
          <Text className="text-sm text-slate-600 dark:text-slate-400 mb-2" numberOfLines={2}>
            {item.excerpt}
          </Text>
          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap">
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mr-1 mb-1">
                  <Text className="text-xs text-slate-600 dark:text-slate-300">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View className="flex-1 bg-slate-100 dark:bg-black" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {/* Search Bar */}
        <View className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <IconSymbol name="chevron.left" size={24} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
            <View className="flex-1 flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
              <IconSymbol name="magnifyingglass" size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
              <TextInput
                className="flex-1 ml-2 text-base text-slate-900 dark:text-white"
                placeholder="搜索讲道、标签..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => performSearch()}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* Content */}
        <View className="flex-1 px-4 pt-4">
          {isSearching ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="mt-4 text-slate-500 dark:text-slate-400">搜索中...</Text>
            </View>
          ) : hasSearched ? (
            <View className="flex-1">
              <Text className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                找到 {searchResults.length} 篇相关讲道
              </Text>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View className="items-center justify-center py-20">
                    <IconSymbol name="doc.text.magnifyingglass" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
                    <Text className="text-slate-400 dark:text-slate-500 mt-4">未找到相关讲道</Text>
                  </View>
                }
              />
            </View>
          ) : (
            <View className="flex-1">
              {searchHistory.length > 0 && (
                <>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-base font-bold text-slate-900 dark:text-white">搜索历史</Text>
                    <TouchableOpacity onPress={handleClearHistory}>
                      <Text className="text-sm text-blue-600 dark:text-blue-400">清空</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap">
                    {searchHistory.map((query, index) => (
                      <TouchableOpacity
                        key={index}
                        className="bg-white dark:bg-slate-900 px-4 py-2 rounded-full mr-2 mb-2 flex-row items-center border border-slate-200 dark:border-slate-700"
                        onPress={() => handleHistoryItemPress(query)}
                      >
                        <Text className="text-sm text-slate-700 dark:text-slate-300 mr-2">{query}</Text>
                        <TouchableOpacity onPress={() => handleRemoveHistoryItem(query)}>
                          <IconSymbol name="xmark" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </>
  );
}
