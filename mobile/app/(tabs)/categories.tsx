import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, useColorScheme, Platform, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { getCategories, getPosts, getCachedCategories, getCachedPosts } from '../../services/api';
import { Category, BlogPost } from '../../types';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  const [selectedL1Id, setSelectedL1Id] = useState<number | null>(null);
  const [selectedL2Id, setSelectedL2Id] = useState<number | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const BIBLE_ORDER = [
    "创世记", "出埃及记", "利未记", "民数记", "申命记",
    "约书亚记", "士师记", "路得记", "撒母耳记上", "撒母耳记下",
    "列王纪上", "列王纪下", "历代志上", "历代志下", "以斯拉记", 
    "尼希米记", "以斯帖记","约伯记", "诗篇", "箴言", "传道书", 
    "雅歌", "以赛亚书","耶利米书", "耶利米哀歌", "以西结书",
    "但以理书", "何西阿书", "约珥书", "阿摩司书", "俄巴底亚书",
    "约拿书", "弥迦书", "那鸿书", "哈巴谷书", "西番雅书", 
    "哈该书", "撒迦利亚书", "玛拉基书","马太福音","马可福音", 
    "路加福音", "约翰福音", "使徒行传", "罗马书","哥林多前书", 
    "哥林多后书", "加拉太书", "以弗所书", "腓立比书","歌罗西书", 
    "帖撒罗尼迦前书", "帖撒罗尼迦后书", "提摩太前书", "提摩太后书","提多书",
    "腓利门书", "希伯来书", "雅各书", "彼得前书", "彼得后书",
    "约翰一书", "约翰二书", "约翰三书", "犹大书", "启示录"
  ];

  useEffect(() => {
    const processCategories = (data: Category[]) => {
        return data.sort((a, b) => {
            const indexA = BIBLE_ORDER.indexOf(a.name);
            const indexB = BIBLE_ORDER.indexOf(b.name);

            const isBibleA = indexA !== -1;
            const isBibleB = indexB !== -1;

            if (isBibleA && isBibleB) {
                return indexA - indexB;
            }
            if (isBibleA) return 1; // Bible books come AFTER others
            if (isBibleB) return -1; // Bible books come AFTER others

            return a.name.localeCompare(b.name, 'zh-CN');
        });
    };

    const loadData = async () => {
      // 1. Try cache first
      try {
        const [cachedCats, cachedPosts] = await Promise.all([
          getCachedCategories(),
          getCachedPosts()
        ]);

        if (cachedCats && cachedCats.length > 0) {
           const sortedData = processCategories([...cachedCats]);
           setCategories(sortedData);
           const firstL1 = sortedData.find(c => !c.parentId);
           setSelectedL1Id(prev => prev || (firstL1 ? firstL1.id : null));
           setLoadingCats(false);
        }
        
        if (cachedPosts && cachedPosts.length > 0) {
            setAllPosts(cachedPosts);
            setLoadingPosts(false);
        }
      } catch (e) {
        console.log('Cache load error', e);
      }

      // 2. Fetch from network
      try {
        const cats = await getCategories();
        const sortedData = processCategories(cats);
        setCategories(sortedData);
        
        setSelectedL1Id(prev => {
            if (prev) return prev;
            const firstL1 = sortedData.find(c => !c.parentId);
            return firstL1 ? firstL1.id : null;
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCats(false);
      }

      try {
        const posts = await getPosts();
        setAllPosts(posts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadData();
  }, []);

  const l1Categories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const l2Categories = useMemo(() => {
    if (!selectedL1Id) return [];
    return categories.filter(c => c.parentId === selectedL1Id);
  }, [categories, selectedL1Id]);

  // Determine which category to fetch posts for
  const activeCategoryId = selectedL2Id || selectedL1Id;

  // Recursive function to get all descendant category IDs
  const getDescendantIds = (rootId: number): number[] => {
      const children = categories.filter(c => c.parentId === rootId);
      let ids = children.map(c => c.id);
      children.forEach(child => {
          ids = [...ids, ...getDescendantIds(child.id)];
      });
      return ids;
  };

  const filteredPosts = useMemo(() => {
    if (!activeCategoryId) return [];
    
    const targetIds = new Set([activeCategoryId, ...getDescendantIds(activeCategoryId)]);
    return allPosts.filter(p => targetIds.has(p.categoryId));
  }, [allPosts, activeCategoryId, categories]);

  const handleL1Select = (id: number) => {
    setSelectedL1Id(id);
    setSelectedL2Id(null); // Reset L2 when L1 changes
  };

  const renderPostItem = ({ item }: { item: BlogPost }) => (
    <Link href={`/post/${item.id}`} asChild>
      <TouchableOpacity className="bg-white dark:bg-gray-800 p-3 mb-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        {item.coverImage ? (
          <View className="w-full h-32 rounded-md mb-2 overflow-hidden">
            <Image 
                source={{ uri: item.coverImage }} 
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={500}
            />
          </View>
        ) : null}
        <Text className="text-base font-bold text-gray-900 dark:text-white mb-1" numberOfLines={2}>{item.title}</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-xs mb-2" numberOfLines={10}>{item.excerpt}</Text>
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-2">
            {item.tags.map((tag, index) => (
              <View key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2 mb-1">
                <Text className="text-[10px] text-gray-600 dark:text-gray-300">{tag}</Text>
              </View>
            ))}
          </View>
        )}
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Top Horizontal L1 Categories */}
      <View className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          {l1Categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleL1Select(cat.id)}
              className={`px-4 justify-center h-full border-b-2 ${
                selectedL1Id === cat.id ? 'border-blue-600' : 'border-transparent'
              }`}
            >
              <Text className={`text-lg ${
                selectedL1Id === cat.id 
                  ? 'text-blue-600 font-bold' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="flex-1 flex-row">
        {/* Left Vertical L2 Categories */}
        <View className="w-24 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <ScrollView className="flex-1">
            <TouchableOpacity
              onPress={() => setSelectedL2Id(null)}
              className={`p-3 border-l-4 ${
                selectedL2Id === null 
                  ? 'bg-white dark:bg-black border-blue-600' 
                  : 'border-transparent'
              }`}
            >
              <Text className={`text-base ${
                selectedL2Id === null 
                  ? 'text-blue-600 font-bold' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>全部</Text>
            </TouchableOpacity>
            {l2Categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedL2Id(cat.id)}
                className={`p-3 border-l-4 ${
                  selectedL2Id === cat.id 
                    ? 'bg-white dark:bg-black border-blue-600' 
                    : 'border-transparent'
                }`}
              >
                <Text className={`text-base ${
                  selectedL2Id === cat.id 
                    ? 'text-blue-600 font-bold' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Right Main Content */}
        <View className="flex-1 bg-gray-50 dark:bg-black p-2">
          {loadingPosts ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <View className="items-center justify-center py-10">
                  <Text className="text-gray-400 dark:text-gray-500">该分类下暂无讲道</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
