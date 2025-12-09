import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions, useColorScheme, TouchableOpacity, Modal, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import RenderHtml, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import { marked } from 'marked';
import { getPostById } from '../../services/api';
import { BlogPost } from '../../types';
import AudioPlayer from '../../components/AudioPlayer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { markPostAsRead, saveReadingProgress, getReadingProgress } from '../../services/readingHistory';

const customHTMLElementModels = {
  mark: HTMLElementModel.fromCustomModel({
    tagName: 'mark',
    contentModel: HTMLContentModel.mixed
  })
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [fontSizeScale, setFontSizeScale] = useState(1.0);
  const [tocVisible, setTocVisible] = useState(false);
  const [toc, setToc] = useState<{text: string, level: number, key: string}[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const headerPositionsRef = useRef<{[index: number]: number}>({});
  const htmlContainerYRef = useRef(0);
  const [initialScrollY, setInitialScrollY] = useState(0);

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
    return {
        h1: HeadingRenderer,
        h2: HeadingRenderer,
        h3: HeadingRenderer
    };
  }, [toc]);

  // Define Stack.Screen here to ensure title is set even during loading
  const stackScreen = (
    <Stack.Screen 
        options={{ 
          title: '讲道详情',
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
                <TouchableOpacity onPress={() => setFontSizeScale(s => s >= 1.4 ? 1.0 : s + 0.2)} className="mr-4">
                    <Text className="text-blue-600 font-bold text-lg">A{fontSizeScale > 1 ? '+' : ''}</Text>
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

      getPostById(postId)
        .then(data => {
          setPost(data);
          // Parse TOC
          const tokens = marked.lexer(data.content);
          const headings = tokens
            .filter((t: any) => t.type === 'heading')
            .map((t: any, index: number) => ({
              text: t.text,
              level: t.depth,
              key: `heading-${index}`
            }));
          setToc(headings);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (id) {
        const y = event.nativeEvent.contentOffset.y;
        // Debounce or just save. Since AsyncStorage is async, maybe throttle?
        // For simplicity, we just call it. It's async so it won't block UI much, 
        // but ideally we should debounce.
        // Let's just save every 1s or so if we wanted to be perfect, but here we rely on the OS handling async writes.
        // To avoid too many writes, let's only save if y > 0.
        if (y > 0) {
            saveReadingProgress(Number(id), y);
        }
    }
  }, [id]);

  // Scroll to initial position after content is ready
  // We can use onLayout of the main view or just a timeout
  useEffect(() => {
    if (!loading && initialScrollY > 0 && scrollViewRef.current) {
        // Small delay to ensure layout is done
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: initialScrollY, animated: false });
        }, 100);
    }
  }, [loading, initialScrollY]);

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
    strong: {
        fontWeight: 'bold',
        color: isDark ? '#fff' : '#000',
    },
    b: {
        fontWeight: 'bold',
        color: isDark ? '#fff' : '#000',
    },
    h3: { 
      color: isDark ? '#e5e7eb' : '#374151', 
      fontSize: baseFontSize * 1.1, 
      marginTop: 16, 
      marginBottom: 8, 
      fontWeight: 'bold', 
      lineHeight: lineHeight * 1.1 
    },
    p: { 
      marginBottom: 16, 
      fontSize: baseFontSize, 
      lineHeight: lineHeight, 
      color: isDark ? '#e5e7eb' : '#374151' 
    },
    blockquote: { 
      backgroundColor: isDark ? '#1f2937' : '#f9fafb', 
      borderLeftColor: '#2563eb', 
      borderLeftWidth: 4, 
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 16,
      fontStyle: 'italic',
      color: isDark ? '#9ca3af' : '#4b5563'
    },
    code: { 
      backgroundColor: isDark ? '#374151' : '#f3f4f6', 
      paddingHorizontal: 6, 
      paddingVertical: 2, 
      borderRadius: 4, 
      fontFamily: 'monospace',
      color: isDark ? '#e5e7eb' : '#1f2937'
    },
    pre: {
      backgroundColor: isDark ? '#111827' : '#1f2937',
      padding: 16,
      borderRadius: 8,
      overflow: 'scroll',
    },
    mark: {
        backgroundColor: '#fef08a', // yellow-200
        color: '#854d0e', // yellow-800
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    small: {
        fontSize: baseFontSize * 0.8,
        color: isDark ? '#9ca3af' : '#6b7280',
    }
  };

  const scrollToHeader = (index: number) => {
    setTocVisible(false);
    const y = headerPositionsRef.current[index];
    if (y !== undefined && scrollViewRef.current) {
        // Scroll to the heading position + container position
        // Subtract a small buffer (e.g. 20) so the title isn't stuck to the very top edge
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
            scrollEventThrottle={1000} // Only fire every 1s roughly (actually it's ms, so 16ms is 60fps. 1000 is 1s)
        >
            <View>
                {post.coverImage ? (
                <View className="w-full h-64 overflow-hidden">
                    <Image 
                        source={{ uri: post.coverImage }} 
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={500}
                    />
                </View>
                ) : null}
                
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
      </View>
    </>
  );
}
