import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView, useColorScheme, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getPosts, getCategories, getCachedPosts, getCachedCategories } from '../../services/api';
import { BlogPost, Category } from '../../types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getReadPostIds } from '../../services/readingHistory';

export default function HomeScreen() {
  const { categoryId } = useLocalSearchParams();
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [readPostIds, setReadPostIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const carouselRef = useRef<FlatList>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const fetchPosts = async () => {
    try {
      setError(null);
      
      // Fetch ALL posts for client-side filtering
      // Timeout is now handled in api.ts, which will fallback to cache on failure
      const [postsData, categoriesData] = await Promise.all([
        getPosts(),
        getCategories()
      ]);
      
      setAllPosts(postsData);
      setCategories(categoriesData);
    } catch (err) {
      setError('无法连接到服务器，请检查网络');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // 1. 尝试立即加载缓存 (Stale-While-Revalidate 策略)
      try {
        const [cachedPosts, cachedCats] = await Promise.all([
          getCachedPosts(categoryId ? Number(categoryId) : undefined),
          getCachedCategories()
        ]);
        
        // 只有当缓存中有数据时才提前显示
        if (cachedPosts && cachedCats && (cachedPosts.length > 0 || cachedCats.length > 0)) {
          setAllPosts(cachedPosts);
          setCategories(cachedCats);
          setLoading(false); // 立即停止加载状态，让用户可以交互
        }
      } catch (e) {
        console.log('Error reading cache', e);
      }

      // 2. 后台刷新数据 (这可能会花费较长时间如果服务器冷启动)
      await fetchPosts();
    };

    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      getReadPostIds().then(ids => {
        setReadPostIds(new Set(ids));
      });
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const filteredPosts = useMemo(() => {
    return allPosts.filter(post => {
      // Filter by Category
      if (categoryId) {
        if (post.categoryId !== Number(categoryId)) return false;
      }
      return true;
    });
  }, [allPosts, categoryId]);

  const featuredPosts = useMemo(() => allPosts.filter(p => p.isFeatured), [allPosts]);

  // Auto-play carousel
  useEffect(() => {
    if (featuredPosts.length <= 1) return;

    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % featuredPosts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredPosts.length]);

  const handlePrevSlide = () => {
    setCarouselIndex(prev => (prev - 1 + featuredPosts.length) % featuredPosts.length);
  };

  const handleNextSlide = () => {
    setCarouselIndex(prev => (prev + 1) % featuredPosts.length);
  };

  const getCategoryName = (id: number) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : '';
  };

  const renderItem = ({ item }: { item: BlogPost }) => {
    const isRead = readPostIds.has(item.id);
    return (
    <Link href={`/post/${item.id}`} asChild>
      <TouchableOpacity className={`bg-white dark:bg-slate-900 p-4 mb-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mx-4 active:opacity-70 ${isRead ? 'opacity-80 bg-slate-50 dark:bg-slate-900/50' : ''}`}>
        <View className="relative">
            {item.coverImage ? (
            <View className={`w-full h-48 rounded-xl mb-3 overflow-hidden ${isRead ? 'opacity-90' : ''}`}>
              <Image 
                  source={{ uri: item.coverImage }} 
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={500}
              />
            </View>
            ) : null}
            {item.categoryId && getCategoryName(item.categoryId) ? (
                <View className="absolute top-2 left-2 bg-blue-600/90 px-2.5 py-1 rounded-md shadow-sm backdrop-blur-md">
                    <Text className="text-white text-xs font-bold tracking-wide">
                        {getCategoryName(item.categoryId)}
                    </Text>
                </View>
            ) : null}
        </View>

        <Text className={`text-lg font-bold mb-2 leading-tight ${isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{item.title}</Text>
        <Text className="text-slate-600 dark:text-slate-400 text-sm mb-3 leading-relaxed" numberOfLines={2}>{item.excerpt}</Text>
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-3">
            {item.tags.map((tag, index) => (
              <View key={index} className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md mr-2 mb-1">
                <Text className="text-xs text-slate-600 dark:text-slate-300 font-medium">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800">
          <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {new Date(item.createdAt).toLocaleDateString()}
            {isRead && <Text className="text-slate-400 ml-2"> • 已读</Text>}
          </Text>
          <View className="flex-row items-center">
            <Text className={`text-xs font-bold mr-1 ${isRead ? 'text-slate-500' : 'text-blue-600 dark:text-blue-400'}`}>阅读更多</Text>
            <IconSymbol name="chevron.right" size={12} color={isRead ? '#94a3b8' : (isDark ? '#60a5fa' : '#2563eb')} />
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
  };

  const renderHeader = () => (
    <View 
      className="bg-slate-100 dark:bg-black"
      style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10 }}
    >
      <View className="items-center mb-4 px-4">
        <Link href="/about" asChild>
          <TouchableOpacity>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white font-serif tracking-tight">访问古道</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Featured Carousel - Single View Implementation */}
      {!categoryId && featuredPosts.length > 0 && (
        <View className="mb-6 px-4">
          <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3 ml-1">精选讲道</Text>
          
          <View className="relative rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 h-48 shadow-sm">
            <Link href={`/post/${featuredPosts[carouselIndex].id}`} asChild>
              <TouchableOpacity className="w-full h-full active:opacity-90">
                {featuredPosts[carouselIndex].coverImage ? (
                  <View className="w-full h-full overflow-hidden">
                    <Image 
                      source={{ uri: featuredPosts[carouselIndex].coverImage }} 
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={500}
                    />
                  </View>
                ) : null}

                {/* Category Label */}
                {featuredPosts[carouselIndex].categoryId && getCategoryName(featuredPosts[carouselIndex].categoryId) ? (
                    <View className="absolute top-2 left-2 bg-blue-600/90 px-2.5 py-1 rounded-md shadow-sm backdrop-blur-md z-10">
                        <Text className="text-white text-xs font-bold tracking-wide">
                            {getCategoryName(featuredPosts[carouselIndex].categoryId)}
                        </Text>
                    </View>
                ) : null}

                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                  <Text className="text-white font-bold text-lg mb-1 leading-tight" numberOfLines={1}>
                    {featuredPosts[carouselIndex].title}
                  </Text>
                  <Text className="text-slate-200 text-xs font-medium" numberOfLines={1}>
                    {featuredPosts[carouselIndex].excerpt}
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>

            {/* Navigation Buttons */}
            {featuredPosts.length > 1 && (
              <>
                <TouchableOpacity 
                  onPress={handlePrevSlide}
                  className="absolute left-2 top-1/2 -mt-4 bg-black/30 p-2 rounded-full z-10"
                >
                  <IconSymbol name="chevron.left" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleNextSlide}
                  className="absolute right-2 top-1/2 -mt-4 bg-black/30 p-2 rounded-full z-10"
                >
                  <IconSymbol name="chevron.right" size={20} color="white" />
                </TouchableOpacity>
                
                {/* Indicators */}
                <View className="absolute bottom-2 right-4 flex-row space-x-1">
                  {featuredPosts.map((_, idx) => (
                    <View 
                      key={idx} 
                      className={`w-1.5 h-1.5 rounded-full ${idx === carouselIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing && allPosts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-100 dark:bg-black">
        {renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-slate-500 dark:text-slate-400 font-medium">正在加载讲道...</Text>
          <Text className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-center px-10">
            首次启动可能需要唤醒服务器，请耐心等待...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-100 dark:bg-black">
        {renderHeader()}
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-lg mb-2">出错了</Text>
          <Text className="text-slate-600 dark:text-slate-400 text-center mb-4">{error}</Text>
          <TouchableOpacity 
            onPress={() => fetchPosts()}
            className="bg-blue-600 px-6 py-2 rounded-full"
          >
            <Text className="text-white font-bold">重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-black">
      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 dark:text-slate-500">暂无讲道</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}
