import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions, useColorScheme, TouchableOpacity, Modal, FlatList, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import { Image } from 'expo-image';
import RenderHtml, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import { marked } from 'marked';
import { getPostById, getCategories } from '../../services/api';
import { BlogPost, Category } from '../../types';
import AudioPlayer from '../../components/AudioPlayer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { markPostAsRead, saveReadingProgress, getReadingProgress } from '../../services/readingHistory';
import ImageView from "react-native-image-viewing";
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const HYMN_FIXED_COVER = "https://media.ancientpath.dpdns.org/images/Hymns/hymncover.webp";

const customHTMLElementModels = {
  mark: HTMLElementModel.fromCustomModel({
    tagName: 'mark',
    contentModel: HTMLContentModel.mixed
  })
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [fontSizeScale, setFontSizeScale] = useState(1.0);
  
  const [tocVisible, setTocVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toc, setToc] = useState<{text: string, level: number, key: string}[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]); // Immutable original URLs for indexing
  
  const viewerImages = useMemo(() => imageUrls.map(uri => ({ uri })), [imageUrls]);
  
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true); // Control footer visibility
  
  const scrollViewRef = useRef<ScrollView>(null);
  const headerPositionsRef = useRef<{[index: number]: number}>({});
  const htmlContainerYRef = useRef(0);
  const [initialScrollY, setInitialScrollY] = useState(0);

  const isHymn = useMemo(() => {
    if (!post || categories.length === 0) return false;
    const category = categories.find(c => c.id === post.categoryId);
    if (!category) return false;
    const parent = categories.find(c => c.id === category.parentId);
    return (parent?.name === '韵律诗篇' || parent?.name === '圣诗' || category.name === '韵律诗篇' || category.name === '圣诗');
  }, [post, categories]);

  const renderers = useMemo(() => {
    function getText(tnode: any): string {
        if (tnode.type === 'text') return tnode.data;
        if (tnode.children) return tnode.children.map(getText).join('');
        return '';
    }

    const HeadingRenderer = ({ TDefaultRenderer, ...props }: any) => {
        const onLayout = (e: any) => {
            const y = e.nativeEvent.layout.y;
            const text = getText(props.tnode);
            // Simple matching by text content
            const index = toc.findIndex(t => t.text === text);
            if (index !== -1) {
                headerPositionsRef.current[index] = y;
            }
        };
        return (
            <View onLayout={onLayout}>
                <TDefaultRenderer {...props} />
            </View>
        );
    };

    const ImageRenderer = ({ tnode }: any) => {
        const src = tnode.attributes.src;
        // 使用自适应高度组件，避免左右留白
        const [aspectRatio, setAspectRatio] = useState(16 / 9); // 默认比例

        // Find index of this image to open viewer correctly
        const index = originalImageUrls.indexOf(src);

        return (
            <TouchableOpacity 
                onPress={() => {
                   // If found in gallery, open at index; otherwise fallback to single image view
                   if (index !== -1) {
                       setViewerIndex(index);
                       setViewerVisible(true);
                       setControlsVisible(true);
                   } else {
                       console.warn("Image found in render but not in extracted list:", src);
                   }
                }} 
                activeOpacity={0.9} 
                className="my-4 relative"
            >
                <Image 
                    source={{ uri: src }}
                    style={{ width: '100%', aspectRatio: aspectRatio, borderRadius: 8, backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}
                    contentFit="contain"
                    transition={500}
                    onLoad={(e) => {
                        const { width, height } = e.source;
                        if (width && height) {
                            setAspectRatio(width / height);
                        }
                    }}
                />
                <View className="absolute top-2 left-2 bg-black/50 px-3 py-1.5 rounded-full flex-row items-center backdrop-blur-sm">
                    <IconSymbol name="magnifyingglass" size={12} color="white" />
                    <Text className="text-white text-xs ml-1.5 font-medium">点击图片查看大图</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return {
        h1: HeadingRenderer,
        h2: HeadingRenderer,
        h3: HeadingRenderer,
        img: ImageRenderer
    };
  }, [toc, isDark, originalImageUrls]);

  // Define Stack.Screen here to ensure title is set even during loading
  const stackScreen = (
    <Stack.Screen 
        options={{ 
          title: isHymn ? '诗歌详情' : '讲道详情',
          headerBackTitle: '返回',
          headerTintColor: '#2563eb',
          headerStyle: {
            backgroundColor: isDark ? '#000' : '#fff',
          },
          headerTitleStyle: {
            color: isDark ? '#fff' : '#000',
          },
          headerRight: () => (
            <View className="flex-row">
                <TouchableOpacity onPress={() => setSettingsVisible(true)} className="mr-4">
                    <IconSymbol name="textformat.size" size={24} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
            </View>
          )
        }} 
      />
  );

  useEffect(() => {
    if (id) {
      const postId = Number(id);
      
      // Mark as read
      markPostAsRead(postId);

      // Get reading progress
      getReadingProgress(postId).then(y => {
        if (y > 0) {
            setInitialScrollY(y);
        }
      });

      Promise.all([
          getPostById(postId),
          getCategories()
      ])
        .then(([postData, cats]) => {
          setPost(postData);
          setCategories(cats);
          // Parse TOC
          const tokens = marked.lexer(postData.content);
          const headings = tokens
            .filter((t: any) => t.type === 'heading')
            .map((t: any, index: number) => ({
              text: t.text.replace(/<[^>]+>/g, ''),
              level: t.depth,
              key: `heading-${index}`
            }));
          setToc(headings);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Extract images from HTML content
  useEffect(() => {
    if (post?.content) {
      const html = marked.parse(post.content);
      const invalidHtml = typeof html === 'string' ? html : '';
      const regex = /<img[^>]+src=["']([^"']+)["']/g;
      const matches = [];
      let match;
      while ((match = regex.exec(invalidHtml)) !== null) {
        matches.push(match[1]);
      }
      setImageUrls(matches);
      setOriginalImageUrls(matches);
    }
  }, [post?.content]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (id) {
        const y = event.nativeEvent.contentOffset.y;
        if (y > 0) {
            saveReadingProgress(Number(id), y);
        }
    }
  }, [id]);

  // Scroll to initial position after content is ready
  useEffect(() => {
    if (!loading && initialScrollY > 0 && scrollViewRef.current) {
        // Small delay to ensure layout is done
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: initialScrollY, animated: false });
        }, 100);
    }
  }, [loading, initialScrollY]);

  const handleRotateRight = async () => {
    const currentUrl = imageUrls[viewerIndex];
    if (!currentUrl) return;
    
    try {
      const result = await manipulateAsync(
        currentUrl,
        [{ rotate: 90 }],
        { format: SaveFormat.PNG }
      );
      
      const newUrls = [...imageUrls];
      newUrls[viewerIndex] = result.uri;
      setImageUrls(newUrls);
    } catch (error) {
      console.error("Rotate error:", error);
    }
  };

  const handleRotateLeft = async () => {
    const currentUrl = imageUrls[viewerIndex];
    if (!currentUrl) return;
    
    try {
      const result = await manipulateAsync(
        currentUrl,
        [{ rotate: -90 }],
        { format: SaveFormat.PNG }
      );
      
      const newUrls = [...imageUrls];
      newUrls[viewerIndex] = result.uri;
      setImageUrls(newUrls);
    } catch (error) {
      console.error("Rotate error:", error);
    }
  };

  if (loading) {
    return (
      <>
        {stackScreen}
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </>
    );
  }

  if (!post) {
    return (
      <>
        {stackScreen}
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
          <Text className="text-gray-500 dark:text-gray-400">讲道未找到</Text>
        </View>
      </>
    );
  }

  const htmlContent = marked.parse(post.content);

  const baseFontSize = 18 * fontSizeScale;
  const lineHeight = 30 * fontSizeScale;

  const tagsStyles = {
    body: { 
      color: isDark ? '#e5e7eb' : '#374151', 
      fontSize: baseFontSize, 
      lineHeight: lineHeight 
    },
    div: {
      marginTop: 8,
      marginBottom: 8,
    },
    span: {
      // Inline styles like color will be applied automatically
    },
    h1: { 
      color: isDark ? '#f3f4f6' : '#111827', 
      fontSize: baseFontSize * 1.5, 
      marginTop: 24, 
      marginBottom: 12, 
      fontWeight: 'bold', 
      lineHeight: lineHeight * 1.3 
    },
    h2: { 
      color: isDark ? '#e5e7eb' : '#1f2937', 
      fontSize: baseFontSize * 1.3, 
      marginTop: 20, 
      marginBottom: 10, 
      fontWeight: 'bold', 
      lineHeight: lineHeight * 1.2 
    },
    h3: { 
      color: isDark ? '#e5e7eb' : '#374151', 
      fontSize: baseFontSize * 1.1, 
      marginTop: 16, 
      marginBottom: 8, 
      fontWeight: 'bold', 
      lineHeight: lineHeight * 1.1 
    },
    h4: {
      color: isDark ? '#e5e7eb' : '#374151', 
      fontSize: baseFontSize * 1.05, 
      marginTop: 14, 
      marginBottom: 6, 
      fontWeight: 'bold', 
    },
    p: { 
      marginTop: 0,
      marginBottom: 16, 
      fontSize: baseFontSize, 
      lineHeight: lineHeight, 
      color: isDark ? '#e5e7eb' : '#374151' 
    },
    strong: {
        fontWeight: 'bold',
        color: isDark ? '#fff' : '#000',
    },
    b: {
        fontWeight: 'bold',
        color: isDark ? '#fff' : '#000',
    },
    em: {
        fontStyle: 'italic',
    },
    i: {
        fontStyle: 'italic',
    },
    u: {
        textDecorationLine: 'underline',
    },
    s: {
        textDecorationLine: 'line-through',
    },
    blockquote: { 
      backgroundColor: isDark ? '#1f2937' : '#f9fafb', 
      borderLeftColor: '#2563eb', 
      borderLeftWidth: 4, 
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 16,
      fontStyle: 'normal',
      color: isDark ? '#9ca3af' : '#4b5563'
    },
    code: { 
      backgroundColor: isDark ? '#374151' : '#f3f4f6', 
      paddingHorizontal: 6, 
      paddingVertical: 2, 
      borderRadius: 4, 
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: baseFontSize * 0.85,
      color: isDark ? '#e5e7eb' : '#ef4444' // Red color for better visibility usually
    },
    pre: {
      backgroundColor: isDark ? '#111827' : '#1f2937',
      padding: 16,
      borderRadius: 8,
      marginVertical: 16,
    },
    mark: {
        backgroundColor: '#fef9c3', // yellow-100
        color: '#854d0e', // yellow-800
        paddingHorizontal: 2,
        borderRadius: 2,
    },
    small: {
        fontSize: baseFontSize * 0.8,
        color: isDark ? '#9ca3af' : '#6b7280',
    },
    ul: {
        marginBottom: 16,
        paddingLeft: 20,
    },
    ol: {
        marginBottom: 16,
        paddingLeft: 20,
    },
    li: {
        marginBottom: 4,
    },
    a: {
        color: '#2563eb',
        textDecorationLine: 'underline',
    },
    hr: {
        marginTop: 16,
        marginBottom: 16,
        height: 1,
        backgroundColor: isDark ? '#374151' : '#e5e7eb',
    }
  };

  const scrollToHeader = (index: number) => {
    setTocVisible(false);
    const y = headerPositionsRef.current[index];
    if (y !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ 
            y: y + htmlContainerYRef.current, 
            animated: true 
        });
    }
  };

  return (
    <>
      {stackScreen}
      <View className="flex-1 bg-white dark:bg-black">
        <ScrollView 
            ref={scrollViewRef}
            className="flex-1 bg-white dark:bg-black"
            contentContainerStyle={{ paddingBottom: 80 }}
            onScroll={handleScroll}
            scrollEventThrottle={1000}
        >
            <View>
                <View className="w-full h-64 overflow-hidden">
                    <Image 
                        source={{ uri: isHymn ? HYMN_FIXED_COVER : post.coverImage }} 
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={500}
                    />
                </View>
                
                <View className="px-4 pt-3">
                    <Text selectable className="text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                        {post.title}
                    </Text>
                    
                    <View className="flex-row items-center mb-4 flex-wrap">
                        <Text className="text-gray-400 text-xs mb-2 mr-3">
                        {new Date(post.createdAt).toLocaleDateString()}
                        </Text>
                        {post.tags && post.tags.length > 0 && post.tags.map((tag, index) => (
                        <View key={index} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mr-2 mb-2">
                            <Text className="text-gray-600 dark:text-gray-300 text-xs">#{tag}</Text>
                        </View>
                        ))}
                    </View>

                    {post.audioUrl && (
                        <AudioPlayer uri={post.audioUrl} title={post.title} />
                    )}

                    {/* Hymn Sheet Music Display */}
                    {isHymn && post.coverImage && post.coverImage !== HYMN_FIXED_COVER && (
                        <View className="my-6 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800">
                            <Image 
                                source={{ uri: post.coverImage }} 
                                style={{ width: '100%', height: 500 }}
                                contentFit="contain"
                            />
                        </View>
                    )}
                </View>
            </View>

            <View 
                className="px-4 mb-10"
                onLayout={(e) => { htmlContainerYRef.current = e.nativeEvent.layout.y; }}
            >
                <RenderHtml
                contentWidth={width - 32}
                source={{ html: htmlContent as string }}
                tagsStyles={tagsStyles as any}
                renderers={renderers}
                customHTMLElementModels={customHTMLElementModels}
                defaultTextProps={{ selectable: true }}
                enableCSSInlineProcessing={true}
                enableExperimentalMarginCollapsing={true}
                systemFonts={[Platform.OS === 'ios' ? 'San Francisco' : 'Roboto', 'monospace', 'serif']}
                />
            </View>
        </ScrollView>

        {/* Floating TOC Button */}
        {toc.length > 0 && (
            <TouchableOpacity 
                className="absolute bottom-8 right-6 bg-blue-600 p-4 rounded-full shadow-lg"
                onPress={() => setTocVisible(true)}
            >
                <IconSymbol name="list.bullet" size={24} color="white" />
            </TouchableOpacity>
        )}

        {/* TOC Modal */}
        <Modal
            visible={tocVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setTocVisible(false)}
        >
            <View className="flex-1 justify-end">
                <TouchableOpacity 
                    className="absolute inset-0" 
                    activeOpacity={1} 
                    onPress={() => setTocVisible(false)}
                />
                <View className="bg-slate-100 dark:bg-slate-900 rounded-t-2xl max-h-[70%] p-4 shadow-2xl border-t border-slate-200 dark:border-slate-800">
                    <View className="flex-row justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">目录</Text>
                        <TouchableOpacity onPress={() => setTocVisible(false)}>
                            <IconSymbol name="xmark.circle.fill" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={toc}
                        keyExtractor={item => item.key}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity 
                                className="py-3 border-b border-slate-200 dark:border-slate-800 active:bg-slate-200 dark:active:bg-slate-800 rounded-lg px-2 -mx-2"
                                onPress={() => scrollToHeader(index)}
                            >
                                <Text 
                                    className="text-slate-700 dark:text-slate-300 font-medium"
                                    style={{ marginLeft: (item.level - 1) * 16 }}
                                >
                                    {item.text}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>

        {/* Settings Modal */}
        <Modal
            visible={settingsVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setSettingsVisible(false)}
        >
            <View className="flex-1 justify-end">
                <TouchableOpacity 
                    className="absolute inset-0" 
                    activeOpacity={1} 
                    onPress={() => setSettingsVisible(false)}
                />
                <View className="bg-slate-100 dark:bg-slate-900 rounded-t-2xl p-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 pb-10">
                    <View className="flex-row justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">阅读设置</Text>
                        <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                            <IconSymbol name="xmark.circle.fill" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                    
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-base text-slate-700 dark:text-slate-300 font-medium">字体大小</Text>
                        <Text className="text-slate-500 dark:text-slate-400">{(fontSizeScale * 100).toFixed(0)}%</Text>
                    </View>
                    
                    <View className="flex-row items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                        <TouchableOpacity 
                            onPress={() => setFontSizeScale(s => Math.max(0.8, Math.round((s - 0.1) * 10) / 10))}
                            className="p-3 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                        >
                            <Text className="text-slate-900 dark:text-white text-lg font-bold">A-</Text>
                        </TouchableOpacity>
                        
                        <View className="flex-1 items-center">
                             <Text className="text-slate-900 dark:text-white font-serif" style={{ fontSize: 18 * fontSizeScale }}>预览 Text</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setFontSizeScale(s => Math.min(2.0, Math.round((s + 0.1) * 10) / 10))}
                            className="p-3 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                        >
                            <Text className="text-slate-900 dark:text-white text-lg font-bold">A+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* Full Screen Image Modal */}
        <ImageView
            images={viewerImages}
            imageIndex={viewerIndex}
            visible={viewerVisible}
            onRequestClose={() => setViewerVisible(false)}
            onImageIndexChange={setViewerIndex}
            swipeToCloseEnabled={true}
            doubleTapToZoomEnabled={true}
            // @ts-ignore
            ImageComponent={(props: any) => <Image {...props} transition={0} />}
            HeaderComponent={({ imageIndex }) => (
                <View 
                    style={{ opacity: controlsVisible ? 1 : 0 }}
                    className="w-full flex-row justify-end pt-14 px-6 absolute top-0 z-50 transition-opacity duration-300"
                >
                    <TouchableOpacity 
                        className="p-3 bg-black/40 rounded-full backdrop-blur-md"
                        onPress={() => setViewerVisible(false)}
                    >
                        <IconSymbol name="xmark" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            )}
            FooterComponent={({ imageIndex }) => (
                <View 
                    style={{ opacity: controlsVisible ? 1 : 0 }} 
                    className="pb-12 transition-opacity duration-300 items-center justify-end"
                >
                    <Text className="text-white/90 text-sm mb-8 font-medium bg-black/40 px-5 py-2 rounded-full overflow-hidden backdrop-blur-md border border-white/10">
                        双指缩放 • 长按显隐菜单 • 左右滑动切换
                    </Text>
                    <View className="flex-row justify-center gap-8" pointerEvents={controlsVisible ? "auto" : "none"}>
                        <TouchableOpacity 
                            className="p-5 bg-black/50 rounded-full backdrop-blur-md active:bg-black/70"
                            onPress={handleRotateLeft}
                        >
                            <IconSymbol name="rotate.left" size={28} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className="p-5 bg-black/50 rounded-full backdrop-blur-md active:bg-black/70"
                            onPress={handleRotateRight}
                        >
                            <IconSymbol name="rotate.right" size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            onLongPress={() => setControlsVisible(!controlsVisible)}
        />
      </View>
    </>
  );
}
