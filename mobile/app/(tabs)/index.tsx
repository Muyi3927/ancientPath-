import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, useColorScheme, Platform, StatusBar, useWindowDimensions, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { getPosts, getCategories, getCachedPosts, getCachedCategories } from '../../services/api';
import { BlogPost, Category } from '../../types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getReadPostIds } from '../../services/readingHistory';
import { checkForNewPosts, setupNotificationResponseHandler, clearAllNotifications, initializeNotifications } from '../../services/notificationService';
import { getFavorites } from '../../services/favoriteService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkeletonPost } from '../../components/SkeletonPost';

export default function HomeScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams();
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [readPostIds, setReadPostIds] = useState<Set<number>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [offlinePosts, setOfflinePosts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const carouselRef = useRef<FlatList>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastForegroundSyncRef = useRef<number>(0);

  // 初始化通知服务
  useEffect(() => {
    initializeNotifications();
  }, []);

  const fetchPosts = async (force = false) => {
    try {
      setError(null);
      
      // Fetch ALL posts for client-side filtering
      const [postsData, categoriesData] = await Promise.all([
        getPosts(undefined, undefined, force),
        getCategories(force)
      ]);
      
      const filteredPosts = postsData.filter(p => !p.tags.includes('__draft__'));
      setAllPosts(filteredPosts);
      setCategories(categoriesData);
    } catch (err) {
      setError('无法连接到服务器，请检查网络');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const excludedCategoryIds = useMemo(() => {
    const excludedNames = ['韵律诗篇', '圣诗'];
    const excludedRoots = categories.filter(c => excludedNames.includes(c.name));
    let ids = new Set<number>();
    excludedRoots.forEach(c => {
        ids.add(c.id);
        getDescendantIds(c.id, categories).forEach(id => ids.add(id));
    });
    return ids;
  }, [categories, getDescendantIds]);

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
          setAllPosts(cachedPosts.filter(p => !p.tags.includes('__draft__')));
          setCategories(cachedCats);
          setLoading(false); // 立即停止加载状态，让用户可以交互
        }
      } catch (e) {
        console.log('Error reading cache', e);
      }

      // 2. 后台刷新数据 (这可能会花费较长时间如果服务器冷启动)
      await fetchPosts(true);
      
      // 3. 检查新文章并发送通知
      checkForNewPosts(true).catch(console.error);
    };

    init();
    
    // 设置通知响应处理
    const cleanup = setupNotificationResponseHandler((postId) => {
      router.push(`/post/${postId}`);
    });
    
    return cleanup;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = /inactive|background/.test(appStateRef.current);
      const isNowActive = nextAppState === 'active';
      appStateRef.current = nextAppState;

      if (!wasBackground || !isNowActive) return;

      const now = Date.now();
      // Avoid repeated foreground syncs in a short interval.
      if (now - lastForegroundSyncRef.current < 30_000) return;
      lastForegroundSyncRef.current = now;

      fetchPosts(true);
      checkForNewPosts(true).catch(console.error);
    });

    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      getReadPostIds().then(ids => {
        setReadPostIds(new Set(ids));
      });
      
      getFavorites().then(ids => {
        setFavoriteIds(new Set(ids));
      });
      
      // 检查离线缓存的文章
      checkOfflinePosts();
      
      // 清除通知角标
      clearAllNotifications().catch(console.error);

      // Revalidate on tab focus to keep home list fresh.
      fetchPosts(true);
      checkForNewPosts(true).catch(console.error);
    }, [])
  );
  
  const checkOfflinePosts = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const postCacheKeys = keys.filter(key => key.startsWith('blog_cache_post_'));
      const cachedPostIds = postCacheKeys.map(key => {
        const id = key.replace('blog_cache_post_', '');
        return parseInt(id, 10);
      }).filter(id => !isNaN(id));
      setOfflinePosts(new Set(cachedPostIds));
    } catch (error) {
      console.error('检查离线缓存失败', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
  };

  const filteredPosts = useMemo(() => {
    return allPosts.filter(post => {
      // Exclude hidden categories
      if (excludedCategoryIds.has(post.categoryId)) return false;

      // Filter by Category
      if (categoryId) {
        if (post.categoryId !== Number(categoryId)) return false;
      } else {
        // If no category filter (Home view), check showOnHomepage
        // If showOnHomepage is explicitly false, hide it
        if (post.showOnHomepage === false) return false;
      }
      return true;
    });
  }, [allPosts, categoryId, excludedCategoryIds]);

  const featuredPosts = useMemo(() => allPosts.filter(p => p.isFeatured && !excludedCategoryIds.has(p.categoryId)), [allPosts, excludedCategoryIds]);

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
    const isFavorited = favoriteIds.has(item.id);
    const isOffline = offlinePosts.has(item.id);
    return (
    <Link href={`/post/${item.id}`} asChild>
      <TouchableOpacity className={`bg-white dark:bg-[#1e1a14] p-4 mb-4 rounded-2xl shadow-sm border border-border-light dark:border-[#302820] mx-4 active:opacity-70 ${isRead ? 'opacity-80 bg-warm-50 dark:bg-[#1e1a14]/50' : ''}`}>
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
            {item.categoryId ? (
                <View className="absolute top-2 left-2 bg-primary-600/90 px-2.5 py-1 rounded-md shadow-sm backdrop-blur-md">
                    <Text className="text-white text-xs font-bold tracking-wide">
                        {getCategoryName(item.categoryId)}
                    </Text>
                </View>
            ) : null}
            {/* 收藏和离线标识 */}
            <View className="absolute top-2 right-2 flex-row gap-1">
              {isFavorited && (
                <View className="bg-red-500/90 px-2 py-1 rounded-md shadow-sm backdrop-blur-md">
                  <IconSymbol name="heart.fill" size={12} color="white" />
                </View>
              )}
              {isOffline && (
                <View className="bg-green-500/90 px-2 py-1 rounded-md shadow-sm backdrop-blur-md flex-row items-center">
                  <IconSymbol name="arrow.down.circle.fill" size={10} color="white" />
                  <Text className="text-white text-xs font-bold ml-1">离线</Text>
                </View>
              )}
            </View>
        </View>

        <Text className={`text-lg font-bold mb-2 leading-tight ${isRead ? 'text-text-secondary dark:text-[#d4c4b0]' : 'text-text-primary dark:text-[#f5ece0]'}`}>{item.title}</Text>
        <Text className="text-text-secondary dark:text-[#d4c4b0] text-sm mb-3 leading-relaxed" numberOfLines={10}>{item.excerpt}</Text>
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-3">
            {item.tags.map((tag, index) => (
              <View key={index} className="bg-warm-100 dark:bg-[#252018] px-2.5 py-1 rounded-md mr-2 mb-1">
                <Text className="text-xs text-text-secondary dark:text-[#d4c4b0] font-medium">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row justify-between items-center pt-2 border-t border-border-light dark:border-[#302820]">
          <Text className="text-xs text-text-muted dark:text-[#a89880] font-medium">
            {new Date(item.createdAt).toLocaleDateString()}
            {isRead && <Text className="text-text-muted ml-2"> • 已读</Text>}
            {isFavorited && <Text className="text-red-500 ml-2"> • 已收藏</Text>}
          </Text>
          <View className="flex-row items-center">
            <Text className={`text-xs font-bold mr-1 ${isRead ? 'text-text-muted' : 'text-primary-600 dark:text-primary-400'}`}>阅读更多</Text>
            <IconSymbol name="chevron.right" size={12} color={isRead ? '#a08e7a' : (isDark ? '#f59e38' : '#e36208')} />
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
  };

  const renderHeader = () => (
    <View
      className="bg-warm-100 dark:bg-[#12100c]"
      style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 5 : 5 }}
    >
      <View className="items-center mb-2 px-4">
        <Link href="/about" asChild>
          <TouchableOpacity className="items-center">
            <Text className="text-2xl font-bold text-text-primary dark:text-[#f5ece0] font-serif tracking-tight">访问古道</Text>
            <View className="flex-row items-center mt-1 opacity-60">
                <Text className="text-xs text-text-muted dark:text-[#a89880]">关于我们</Text>
                <IconSymbol name="chevron.right" size={10} color={isDark ? '#a89880' : '#6d5c4a'} />
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        className="mx-4 mb-4 bg-white dark:bg-[#1e1a14] rounded-full px-4 py-3 flex-row items-center shadow-sm border border-border dark:border-[#4a3f30]"
        onPress={() => router.push('/search')}
      >
        <IconSymbol name="magnifyingglass" size={18} color={isDark ? '#a89880' : '#6d5c4a'} />
        <Text className="ml-2 text-text-muted dark:text-[#a89880]">搜索讲道、标签...</Text>
      </TouchableOpacity>

      {/* Featured Carousel - Single View Implementation */}
      {!categoryId && featuredPosts.length > 0 && (
        <View className="mb-6 px-4">
          <Text className="text-lg font-bold text-text-primary dark:text-[#f5ece0] mb-3 ml-1">精选讲道</Text>

          <View className="relative rounded-2xl overflow-hidden bg-warm-200 dark:bg-[#252018] h-48 shadow-sm">
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

                {/* Gradient overlay covering entire image */}
                <View className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Category Label */}
                {featuredPosts[carouselIndex].categoryId ? (
                    <View className="absolute top-2 left-2 bg-primary-600 px-2.5 py-1 rounded-full shadow-lg z-10">
                        <Text className="text-white text-xs font-bold tracking-wide">
                            {getCategoryName(featuredPosts[carouselIndex].categoryId)}
                        </Text>
                    </View>
                ) : null}

                {/* Text content at bottom */}
                <View className="absolute bottom-0 left-0 right-0 p-4 pt-16">
                  <Text 
                    className="text-white font-bold text-lg mb-1 leading-tight" 
                    numberOfLines={2}
                    style={{ textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}
                  >
                    {featuredPosts[carouselIndex].title}
                  </Text>
                  <Text 
                    className="text-slate-200 text-xs font-medium leading-relaxed" 
                    numberOfLines={6}
                    style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
                  >
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
      <SafeAreaView className="flex-1 bg-warm-100 dark:bg-[#12100c]">
        <FlatList
          data={[1, 2, 3, 4]}
          renderItem={() => <SkeletonPost />}
          keyExtractor={(item) => item.toString()}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
          scrollEnabled={false}
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-warm-100 dark:bg-[#12100c]">
        {renderHeader()}
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-lg mb-2">出错了</Text>
          <Text className="text-text-secondary dark:text-[#d4c4b0] text-center mb-4">{error}</Text>
          <TouchableOpacity
            onPress={() => fetchPosts()}
            className="bg-primary-600 px-6 py-2 rounded-full"
          >
            <Text className="text-white font-bold">重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-warm-100 dark:bg-[#12100c]">
      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#f59e38" : "#e36208"} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-text-muted dark:text-[#a89880]">暂无讲道</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}
