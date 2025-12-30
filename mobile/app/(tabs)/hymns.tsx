import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, useColorScheme, Platform, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { getCategories, getPosts, getCachedCategories, getCachedPosts } from '../../services/api';
import { Category, BlogPost } from '../../types';
import { IconSymbol } from '@/components/ui/icon-symbol';

const HYMN_FIXED_COVER = "https://media.ancientpath.dpdns.org/images/Hymns/hymncover.webp";

export default function HymnsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  // Tabs: 'metrical' (韵律诗篇) or 'hymns' (圣诗)
  const [activeTab, setActiveTab] = useState<'metrical' | 'hymns'>('metrical');
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const loadData = async () => {
      // 1. Try cache
      try {
        const [cachedCats, cachedPosts] = await Promise.all([
          getCachedCategories(),
          getCachedPosts()
        ]);
        if (cachedCats && cachedCats.length > 0) {
           setCategories(cachedCats);
           setLoadingCats(false);
        }
        if (cachedPosts && cachedPosts.length > 0) {
            setAllPosts(cachedPosts);
        }
      } catch (e) {}

      // 2. Fetch network
      try {
        const [cats, posts] = await Promise.all([getCategories(), getPosts()]);
        // Sort by name naturally
        cats.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
        setCategories(cats);
        setAllPosts(posts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCats(false);
        setLoadingPosts(false);
      }
    };

    loadData();
  }, []);

  const metricalRoot = useMemo(() => categories.find(c => c.name === '韵律诗篇'), [categories]);
  const hymnsRoot = useMemo(() => categories.find(c => c.name === '圣诗'), [categories]);
  const activeRoot = activeTab === 'metrical' ? metricalRoot : hymnsRoot;

  const subCategories = useMemo(() => {
    if (!activeRoot) return [];
    return categories.filter(c => c.parentId === activeRoot.id);
  }, [categories, activeRoot]);

  // Recursive function to get all descendant category IDs
  const getDescendantIds = useCallback((rootId: number, allCats: Category[]): number[] => {
      const fetchIds = (id: number): number[] => {
          const children = allCats.filter(c => c.parentId === id);
          let result = children.map(c => c.id);
          children.forEach(child => {
              result = [...result, ...fetchIds(child.id)];
          });
          return result;
      };
      return fetchIds(rootId);
  }, []);

  useEffect(() => {
      setSelectedSubCatId(null);
  }, [activeTab]);

  const filteredPosts = useMemo(() => {
    if (!activeRoot) return [];
    
    const targetRootId = selectedSubCatId || activeRoot.id;
    const targetIds = new Set([targetRootId, ...getDescendantIds(targetRootId, categories)]);
    
    return allPosts.filter(p => targetIds.has(p.categoryId));
  }, [allPosts, activeRoot, selectedSubCatId, categories, getDescendantIds]);

  const renderPostItem = ({ item }: { item: BlogPost }) => (
    <Link href={`/post/${item.id}`} asChild>
      <TouchableOpacity className="bg-white dark:bg-slate-900 p-3 mb-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-row">
        <View className="w-24 h-24 rounded-lg overflow-hidden mr-3">
          <Image 
              source={{ uri: HYMN_FIXED_COVER }} 
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
          />
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-base font-bold text-slate-900 dark:text-white mb-1" numberOfLines={2}>{item.title}</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs" numberOfLines={2}>{item.excerpt}</Text>
          <View className="flex-row items-center mt-2">
             <Text className="text-blue-600 dark:text-blue-400 text-xs font-bold">查看曲谱</Text>
             <IconSymbol name="chevron.right" size={12} color={isDark ? '#60a5fa' : '#2563eb'} />
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loadingCats) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }}>
      {/* Top Tabs */}
      <View className="flex-row h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity 
            onPress={() => setActiveTab('metrical')}
            className={`flex-1 items-center justify-center border-b-2 ${activeTab === 'metrical' ? 'border-blue-600' : 'border-transparent'}`}
        >
            <Text className={`text-base ${activeTab === 'metrical' ? 'text-blue-600 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>韵律诗篇</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            onPress={() => setActiveTab('hymns')}
            className={`flex-1 items-center justify-center border-b-2 ${activeTab === 'hymns' ? 'border-blue-600' : 'border-transparent'}`}
        >
            <Text className={`text-base ${activeTab === 'hymns' ? 'text-blue-600 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>圣诗</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 flex-row">
        {/* Left Sidebar */}
        <View className="w-28 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
            {activeRoot && (
                <TouchableOpacity
                    onPress={() => setSelectedSubCatId(null)}
                    className={`p-3 border-l-4 ${selectedSubCatId === null ? 'bg-white dark:bg-black border-blue-600' : 'border-transparent'}`}
                >
                    <Text className={`text-sm ${selectedSubCatId === null ? 'text-blue-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>全部</Text>
                </TouchableOpacity>
            )}
            {subCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedSubCatId(cat.id)}
                className={`p-3 border-l-4 ${selectedSubCatId === cat.id ? 'bg-white dark:bg-black border-blue-600' : 'border-transparent'}`}
              >
                <Text className={`text-sm ${selectedSubCatId === cat.id ? 'text-blue-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View className="flex-1 bg-gray-50 dark:bg-black p-2">
          <FlatList
            data={filteredPosts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Text className="text-gray-400 dark:text-gray-500">该分类下暂无内容</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
