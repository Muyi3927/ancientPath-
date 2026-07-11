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

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name || '';

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
      <TouchableOpacity className="bg-white dark:bg-[#1e1a14] p-3 mb-3 rounded-xl shadow-sm border border-border-light dark:border-[#302820] flex-row">
        <View className="relative w-24 h-24 rounded-lg overflow-hidden mr-3">
          <Image
              source={{ uri: HYMN_FIXED_COVER }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
          />
          <View className="absolute top-1 left-1 bg-primary-600/90 px-1.5 py-0.5 rounded shadow-sm">
            <Text className="text-white text-[8px] font-bold">{getCategoryName(item.categoryId)}</Text>
          </View>
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-base font-bold text-text-primary dark:text-[#f5ece0] mb-1" numberOfLines={2}>{item.title}</Text>
          <Text className="text-text-secondary dark:text-[#d4c4b0] text-xs" numberOfLines={2}>{item.excerpt}</Text>
          <View className="flex-row items-center mt-2">
             <Text className="text-primary-600 dark:text-primary-400 text-xs font-bold">查看曲谱</Text>
             <IconSymbol name="chevron.right" size={12} color={isDark ? '#f59e38' : '#e36208'} />
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loadingCats) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1e1a14]">
        <ActivityIndicator size="large" color="#e36208" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-warm-50 dark:bg-[#12100c]" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }}>
      {/* Top Tabs */}
      <View className="flex-row h-12 bg-white dark:bg-[#1e1a14] border-b border-border dark:border-[#4a3f30]">
        <TouchableOpacity
            onPress={() => setActiveTab('metrical')}
            className={`flex-1 items-center justify-center border-b-2 ${activeTab === 'metrical' ? 'border-primary-600' : 'border-transparent'}`}
        >
            <Text className={`text-base ${activeTab === 'metrical' ? 'text-primary-600 font-bold' : 'text-text-muted dark:text-[#a89880]'}`}>韵律诗篇</Text>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={() => setActiveTab('hymns')}
            className={`flex-1 items-center justify-center border-b-2 ${activeTab === 'hymns' ? 'border-primary-600' : 'border-transparent'}`}
        >
            <Text className={`text-base ${activeTab === 'hymns' ? 'text-primary-600 font-bold' : 'text-text-muted dark:text-[#a89880]'}`}>圣诗</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 flex-row">
        {/* Left Sidebar */}
        <View className="w-28 bg-warm-100 dark:bg-[#1a1610] border-r border-border dark:border-[#4a3f30]">
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
            {activeRoot && (
                <TouchableOpacity
                    onPress={() => setSelectedSubCatId(null)}
                    className={`p-3 border-l-4 ${selectedSubCatId === null ? 'bg-white dark:bg-[#1e1a14] border-primary-600' : 'border-transparent'}`}
                >
                    <Text className={`text-sm ${selectedSubCatId === null ? 'text-primary-600 font-bold' : 'text-text-secondary dark:text-[#d4c4b0]'}`}>全部</Text>
                </TouchableOpacity>
            )}
            {subCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedSubCatId(cat.id)}
                className={`p-3 border-l-4 ${selectedSubCatId === cat.id ? 'bg-white dark:bg-[#1e1a14] border-primary-600' : 'border-transparent'}`}
              >
                <Text className={`text-sm ${selectedSubCatId === cat.id ? 'text-primary-600 font-bold' : 'text-text-secondary dark:text-[#d4c4b0]'}`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <View className="flex-1 bg-warm-50 dark:bg-[#12100c] p-2">
          <FlatList
            data={filteredPosts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Text className="text-text-muted dark:text-[#a89880]">该分类下暂无内容</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
