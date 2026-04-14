import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions, useColorScheme, TouchableOpacity, Modal, FlatList, NativeSyntheticEvent, NativeScrollEvent, Platform, Pressable, TouchableOpacity as RNTouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import RenderHtml, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import { marked } from 'marked';
import { getPostById, getCategories, getCachedPosts } from '../../services/api';
import { BlogPost, Category } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AudioPlayer from '../../components/AudioPlayer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { markPostAsRead, saveReadingProgress, getReadingProgress, incrementPostView } from '../../services/readingHistory';
import ImageView from "react-native-image-viewing";
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { isFavorite, toggleFavorite, getFavorites } from '../../services/favoriteService';
import { getHighlights, addHighlight, removeHighlight, type Highlight } from '../../services/highlightService';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import BibleVerseModal from '../../components/BibleVerseModal';
import { BibleVersionKey } from '../../services/BibleDatabase';

const HYMN_FIXED_COVER = "https://media.ancientpath.dpdns.org/images/Hymns/hymncover.webp";

const customHTMLElementModels = {
  mark: HTMLElementModel.fromCustomModel({
    tagName: 'mark',
    contentModel: HTMLContentModel.mixed
  })
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newerPostId, setNewerPostId] = useState<number | null>(null);
  const [olderPostId, setOlderPostId] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [fontSizeScale, setFontSizeScale] = useState(1.1);

  useEffect(() => {
    AsyncStorage.getItem('article_font_size_scale').then(val => {
      if (val) setFontSizeScale(parseFloat(val));
    });
  }, []);

  const changeFontSize = (delta: number) => {
      setFontSizeScale(prev => {
          const newState = Math.max(0.8, Math.min(2.0, Math.round((prev + delta) * 10) / 10));
          AsyncStorage.setItem('article_font_size_scale', newState.toString());
          return newState;
      });
  };
  
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
  const tocRef = useRef<{text: string, level: number, key: string}[]>([]);
  const [initialScrollY, setInitialScrollY] = useState(0);
  const currentScrollY = useRef(0);
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showImageGuide, setShowImageGuide] = useState(false);
  
  // Bible verse modal states
  const [showBibleModal, setShowBibleModal] = useState(false);
  const [selectedBibleReference, setSelectedBibleReference] = useState('');
  const [bibleVersion, setBibleVersion] = useState<BibleVersionKey>('cuv');

  useEffect(() => {
    const loadImageGuideState = async () => {
      try {
        const hasSeenGuide = await AsyncStorage.getItem('has_seen_image_guide');
        setShowImageGuide(hasSeenGuide !== 'true');
      } catch (e) {
        console.log('Error loading image guide state', e);
        setShowImageGuide(true);
      }
    };
    loadImageGuideState();
  }, []);

  const hideImageGuide = async () => {
    setShowImageGuide(false);
    try {
      await AsyncStorage.setItem('has_seen_image_guide', 'true');
    } catch (e) {
      console.log('Error saving image guide state', e);
    }
  };

  useEffect(() => {
    const calculateNeighbors = async () => {
      if (!id) return;
      
      const allPosts = await getCachedPosts();
      if (!allPosts) return;
      
      const validPosts = allPosts.filter(p => !p.tags.includes('__draft__'));
      const activeId = Number(id);
      const index = validPosts.findIndex(p => p.id === activeId);
      
      if (index === -1) return;
      
      // Index - 1 is newer (if sorted desc)
      if (index > 0) {
        setNewerPostId(validPosts[index - 1].id);
      } else {
        setNewerPostId(null);
      }
      
      // Index + 1 is older (if sorted desc)
      if (index < validPosts.length - 1) {
        setOlderPostId(validPosts[index + 1].id);
      } else {
        setOlderPostId(null);
      }
    };
    
    calculateNeighbors();
  }, [id]);

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
        const viewRef = useRef<View>(null);
        
        const onLayout = (e: any) => {
            // Retrieve the ID we injected via the custom renderer
            const id = props.tnode.attributes.id;
            if (id && viewRef.current && scrollViewRef.current) {
                // Measure position relative to the ScrollView
                viewRef.current.measureLayout(
                    scrollViewRef.current as any,
                    (x, y, width, height) => {
                        const index = tocRef.current.findIndex(t => t.key === id);
                        if (index !== -1) {
                            headerPositionsRef.current[index] = y;
                        }
                    },
                    () => {
                        // Fallback to simple layout if measureLayout fails
                        const y = e.nativeEvent.layout.y;
                        const index = tocRef.current.findIndex(t => t.key === id);
                        if (index !== -1) {
                            headerPositionsRef.current[index] = y + htmlContainerYRef.current;
                        }
                    }
                );
            }
        };
        
        return (
            <View ref={viewRef} onLayout={onLayout}>
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
            <Pressable 
                onPress={() => {
                   // Hide guide on first image tap
                   if (showImageGuide) {
                       hideImageGuide();
                   }
                   
                   // If found in gallery, open at index; otherwise fallback to single image view
                   if (index !== -1) {
                       setViewerIndex(index);
                       setViewerVisible(true);
                       setControlsVisible(true);
                   } else {
                       console.warn("Image found in render but not in extracted list:", src);
                   }
                }} 
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
                {showImageGuide && (
                  <View className="absolute top-2 left-2 bg-black/50 px-3 py-1.5 rounded-full flex-row items-center backdrop-blur-sm">
                      <IconSymbol name="magnifyingglass" size={12} color="white" />
                      <Text className="text-white text-xs ml-1.5 font-medium">点击图片查看大图</Text>
                  </View>
                )}
            </Pressable>
        );
    };
    
    const AnchorRenderer = ({ tnode }: any) => {
        const href = tnode.attributes?.href;
        const bibleRef = tnode.attributes?.['data-bible-ref'];
        
        // 获取链接文本
        const getText = (node: any): string => {
            if (!node) return '';
            if (node.type === 'text') return node.data || '';
            if (node.children && node.children.length > 0) {
                return node.children.map((child: any) => getText(child)).join('');
            }
            return '';
        };
        
        const linkText = getText(tnode);
        
        // 如果是圣经引用链接
        if (href && href.startsWith('#bible:') && bibleRef) {
            return (
                <Text 
                    onPress={() => {
                        const decodedRef = decodeURIComponent(bibleRef);
                        setSelectedBibleReference(decodedRef);
                        setShowBibleModal(true);
                    }}
                    style={{ color: '#2563eb', textDecorationLine: 'underline' }}
                >
                    {linkText}
                </Text>
            );
        }
        
        // PDF 链接 - 在应用内打开
        if (href && href.match(/\.pdf(\?.*)?$/i)) {
            return (
                <Pressable
                    onPress={() => WebBrowser.openBrowserAsync(href, {
                        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                        toolbarColor: isDark ? '#1e293b' : '#2563eb',
                        controlsColor: '#fff',
                        showTitle: true,
                    })}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isDark ? '#3b1c1c' : '#fff1f2',
                        borderWidth: 1,
                        borderColor: '#dc2626',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginVertical: 6,
                        gap: 8,
                    }}
                >
                    <Text style={{ fontSize: 28, lineHeight: 32 }}>📄</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 15 }}>
                            {linkText}
                        </Text>
                        <Text style={{ color: isDark ? '#fca5a5' : '#9b1c1c', fontSize: 12, marginTop: 2 }}>
                            点击在应用内查看 PDF
                        </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#dc2626' }}>›</Text>
                </Pressable>
            );
        }

        // 普通外部链接 - 在应用内浏览器打开
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            return (
                <Text
                    onPress={() => WebBrowser.openBrowserAsync(href, {
                        toolbarColor: isDark ? '#1e293b' : '#2563eb',
                        controlsColor: '#fff',
                        showTitle: true,
                    })}
                    style={{ color: '#2563eb', textDecorationLine: 'underline' }}
                >
                    {linkText}
                </Text>
            );
        }

        // 其他链接（锚点等）
        return <Text style={{ color: '#2563eb', textDecorationLine: 'underline' }}>{linkText}</Text>;
    };

    return {
        h1: HeadingRenderer,
        h2: HeadingRenderer,
        h3: HeadingRenderer,
        h4: HeadingRenderer,
        h5: HeadingRenderer,
        h6: HeadingRenderer,
        img: ImageRenderer,
        a: AnchorRenderer
    };
  }, [isDark, originalImageUrls, showImageGuide]);

  // Define Stack.Screen here to ensure title is set even during loading
  const stackScreen = useMemo(() => (
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
                <Pressable 
                  onPress={async () => {
                    await toggleFavorite(Number(id));
                    const favorites = await getFavorites();
                    setIsFavorited(favorites.includes(Number(id)));
                  }} 
                  className="mr-3"
                >
                    <IconSymbol 
                      name={isFavorited ? "heart.fill" : "heart"} 
                      size={24} 
                      color={isFavorited ? '#ef4444' : (isDark ? '#fff' : '#000')} 
                    />
                </Pressable>
                <Pressable onPress={() => setSettingsVisible(true)} className="mr-4">
                    <IconSymbol name="textformat.size" size={24} color={isDark ? '#fff' : '#000'} />
                </Pressable>
            </View>
          )
        }} 
      />
  ), [isHymn, isDark, isFavorited, id]);

  useEffect(() => {
    if (id) {
      const postId = Number(id);
      
      // Mark as read
      markPostAsRead(postId);
      incrementPostView(postId);

      // Check if favorited
      isFavorite(postId).then(setIsFavorited);
      
      // Load highlights
      getHighlights(postId).then(setHighlights);

      // Get reading progress
      getReadingProgress(postId).then(y => {
        if (y > 0) {
            setInitialScrollY(y);
        }
      });

      Promise.all([
          getPostById(postId, true),
          getCategories(true)
      ])
        .then(([postData, cats]) => {
          setPost(postData);
          setCategories(cats);
          
          // Use a fresh marked instance for TOC extraction to avoid renderer pollution if needed
          // But here we just use the lexer which is fine
          const tokens = marked.lexer(postData.content);
          
          const extractedHeadings: any[] = [];
          
          // Recursive function to find headings in the same order as marked renderer
          const traverse = (nodes: any[]) => {
              if (!nodes || !Array.isArray(nodes)) return;
              for (const node of nodes) {
                  if (node.type === 'heading') {
                      extractedHeadings.push(node);
                  }
                  
                  // Handle nested tokens (blockquotes, etc)
                  if (node.tokens) {
                      traverse(node.tokens);
                  }
                  
                  // Handle list items
                  if (node.items) {
                      node.items.forEach((item: any) => {
                          if (item.tokens) traverse(item.tokens);
                      });
                  }
              }
          };
          
          traverse(tokens);

          let headingCount = 0;
          const headings = extractedHeadings.map((t: any) => {
               // Must match the ID generation logic in the custom renderer below
               const key = `heading-${headingCount++}`; 
               return {
                  text: t.text.replace(/<[^>]+>/g, ''), // Strip HTML tags for list display
                  level: t.depth,
                  key: key
               };
            });
          setToc(headings);
          tocRef.current = headings;
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
        const contentHeight = event.nativeEvent.contentSize.height;
        const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
        
        currentScrollY.current = y;
        
        // 计算阅读进度百分比
        const progress = contentHeight > scrollViewHeight 
          ? (y / (contentHeight - scrollViewHeight)) * 100 
          : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
        
        if (y > 0) {
            saveReadingProgress(Number(id), y);
        }
    }
  }, [id]);
  
  const handleToggleFavorite = useCallback(async () => {
    if (!id) return;
    try {
      const newState = await toggleFavorite(Number(id));
      setIsFavorited(newState);
      Alert.alert(newState ? '已收藏' : '已取消收藏');
    } catch (error) {
      Alert.alert('操作失败', '请稍后再试');
    }
  }, [id]);
  
  const handleAddHighlight = async (text: string) => {
    if (!id || !text.trim()) return;
    try {
      await addHighlight(Number(id), text, '#fef08a');
      const updatedHighlights = await getHighlights(Number(id));
      setHighlights(updatedHighlights);
      Alert.alert('已添加高亮');
    } catch (error) {
      Alert.alert('添加高亮失败');
    }
  };
  
  const handleRemoveHighlight = async (highlightId: string) => {
    if (!id) return;
    try {
      await removeHighlight(Number(id), highlightId);
      const updatedHighlights = await getHighlights(Number(id));
      setHighlights(updatedHighlights);
      Alert.alert('已删除高亮');
    } catch (error) {
      Alert.alert('删除高亮失败');
    }
  };
  
  const handleCopyHighlight = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('已复制到剪贴板');
  };

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

  const [tocMaxLevel, setTocMaxLevel] = useState(3);
  const tocFlatListRef = useRef<FlatList>(null);

  // 过滤目录：简模式下如果没有h1/h2，则显示h3
  const filterToc = useCallback((items: typeof toc) => {
    if (tocMaxLevel >= 6) return items;
    if (tocMaxLevel === 2) {
      const hasH1orH2 = items.some(h => h.level <= 2);
      return items.filter(h => h.level <= (hasH1orH2 ? 2 : 3));
    }
    return items.filter(h => h.level <= tocMaxLevel);
  }, [tocMaxLevel]);

  // Helper function to scroll TOC to current reading position
  const scrollTocToCurrentPosition = useCallback(() => {
    if (!tocFlatListRef.current || toc.length === 0) return;
    
    const filteredToc = filterToc(toc);
    
    // If filtered list is empty, don't try to scroll
    if (filteredToc.length === 0) return;
    
    let currentIndex = 0;
    
    for (let i = 0; i < toc.length; i++) {
      const headingY = headerPositionsRef.current[i];
      if (headingY !== undefined && headingY <= currentScrollY.current + 100) {
        const filteredIndex = filteredToc.findIndex(t => t.key === toc[i].key);
        if (filteredIndex !== -1) {
          currentIndex = filteredIndex;
        }
      }
    }
    
    // Use setTimeout to ensure FlatList is ready, then scroll by estimated offset
    setTimeout(() => {
      if (filteredToc.length > 0) {
        const targetIndex = Math.max(0, Math.min(currentIndex, filteredToc.length - 1));
        // 估算每项高度约49, 居中显示 (viewPosition 0.5 效果)
        const estimatedOffset = Math.max(0, targetIndex * 49 - 150);
        tocFlatListRef.current?.scrollToOffset({
          offset: estimatedOffset,
          animated: false,
        });
      }
    }, 50);
  }, [toc, tocMaxLevel]);

  // Scroll TOC when level changes
  useEffect(() => {
    if (tocVisible) {
      scrollTocToCurrentPosition();
    }
  }, [tocMaxLevel, tocVisible, scrollTocToCurrentPosition]);

  // 验证有效的书卷名
  const VALID_BOOK_NAMES = new Set([
    '太', '马太福音', '可', '马可福音', '路', '路加福音', '约', '约翰福音',
    '徒', '使徒行传', '罗', '罗马书', '林前', '哥林多前书', '林后', '哥林多后书',
    '加', '加拉太书', '弗', '以弗所书', '腓', '腓立比书', '西', '歌罗西书',
    '帖前', '帖撒罗尼迦前书', '帖后', '帖撒罗尼迦后书', '提前', '提摩太前书',
    '提后', '提摩太后书', '多', '提多书', '门', '腓利门书', '来', '希伯来书',
    '雅', '雅各书', '彼前', '彼得前书', '彼后', '彼得后书',
    '约一', '约翰一书', '约壹', '约二', '约翰二书', '约贰', '约三', '约翰三书', '约叁',
    '犹', '犹大书', '启', '启示录',
    '创', '创世记', '出', '出埃及记', '利', '利未记', '民', '民数记', '申', '申命记',
    '书', '约书亚记', '士', '士师记', '得', '路得记',
    '撒上', '撒母耳记上', '撒下', '撒母耳记下', '王上', '列王纪上', '王下', '列王纪下',
    '代上', '历代志上', '代下', '历代志下', '拉', '以斯拉记', '尼', '尼希米记',
    '斯', '以斯帖记', '伯', '约伯记', '诗', '诗篇', '箴', '箴言', '传', '传道书',
    '歌', '雅歌', '赛', '以赛亚书', '耶', '耶利米书', '哀', '耶利米哀歌',
    '结', '以西结书', '但', '但以理书', '何', '何西阿书', '珥', '约珥书',
    '摩', '阿摩司书', '俄', '俄巴底亚书', '拿', '约拿书', '弥', '弥迦书',
    '鸿', '那鸿书', '哈', '哈巴谷书', '番', '西番雅书', '该', '哈该书',
    '亚', '撒迦', '撒迦利亚书', '玛', '玛拉基书'
  ]);

  const BIBLE_NUMBER_TOKEN = '[\\d〇零一二三四五六七八九十百两兩]{1,6}';
  const BIBLE_CHINESE_NUMBER_TOKEN = '[〇零一二三四五六七八九十百两兩]{1,6}';
  const BIBLE_CHAPTER_TOKEN = `(?:\\d{1,3}|${BIBLE_CHINESE_NUMBER_TOKEN}(?=[ \\t\\u3000]*[章篇]))`;
  const BIBLE_CROSS_CHAPTER_TOKEN = `${BIBLE_NUMBER_TOKEN}[ \\t\\u3000]*[:：][ \\t\\u3000]*${BIBLE_NUMBER_TOKEN}`;
  const BIBLE_VERSE_END_TOKEN = `(?:${BIBLE_CROSS_CHAPTER_TOKEN}|${BIBLE_NUMBER_TOKEN})`;
  const BIBLE_VERSE_TOKEN = `${BIBLE_NUMBER_TOKEN}(?:[ \\t\\u3000]*-[ \\t\\u3000]*${BIBLE_VERSE_END_TOKEN})?`;

  const CHINESE_NUMERAL_RE = /^[〇零一二三四五六七八九十百两兩]+$/;
  const BARE_VERSE_RANGE_RE = new RegExp(`^${BIBLE_VERSE_TOKEN}$`);
  const SEGMENT_REFERENCE_REGEX = new RegExp(
    `^(?:第?[ \\t\\u3000]*(${BIBLE_CHAPTER_TOKEN})[ \\t\\u3000]*[章篇]?[ \\t\\u3000]*(?:中|上|下)?[ \\t\\u3000]*)?(?:[:：][ \\t\\u3000]*|[ \\t\\u3000]+)?(${BIBLE_VERSE_TOKEN})?\\s*[节]?$`
  );

  const CN_DIGIT_MAP: Record<string, number> = {
    '〇': 0,
    '零': 0,
    '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9,
  };

  const CN_UNIT_MAP: Record<string, number> = {
    '十': 10,
    '百': 100,
  };

  const chineseNumeralToInt = (input: string): number | null => {
    const s = input.trim().replace(/兩/g, '二').replace(/两/g, '二');
    if (!s || !CHINESE_NUMERAL_RE.test(s)) return null;

    let total = 0;
    let number = 0;

    for (const ch of s) {
      if (ch in CN_DIGIT_MAP) {
        number = CN_DIGIT_MAP[ch];
        continue;
      }

      if (ch in CN_UNIT_MAP) {
        const unit = CN_UNIT_MAP[ch];
        if (number === 0) number = 1;
        total += number * unit;
        number = 0;
        continue;
      }

      return null;
    }

    const result = total + number;
    return result > 0 ? result : null;
  };

  const normalizeBibleNumberToken = (token: string): string | null => {
    const compact = token.replace(/[ \t\u3000]+/g, '').trim();
    if (!compact) return null;

    if (/^\d+$/.test(compact)) {
      return String(parseInt(compact, 10));
    }

    const cn = chineseNumeralToInt(compact);
    return cn ? String(cn) : null;
  };

  const normalizeVersePart = (token: string): string | null => {
    const compact = token.replace(/[ \t\u3000]+/g, '').trim();
    if (!compact) return null;

    if (!compact.includes('-')) {
      return normalizeBibleNumberToken(compact);
    }

    const [startRaw, endRaw] = compact.split('-', 2);
    const start = normalizeBibleNumberToken(startRaw || '');
    if (!start || !endRaw) return null;

    if (endRaw.includes(':') || endRaw.includes('：')) {
      const [endChapterRaw, endVerseRaw] = endRaw.split(/[:：]/, 2);
      const endChapter = normalizeBibleNumberToken(endChapterRaw || '');
      const endVerse = normalizeBibleNumberToken(endVerseRaw || '');
      if (!endChapter || !endVerse) return null;
      return `${start}-${endChapter}:${endVerse}`;
    }

    const end = normalizeBibleNumberToken(endRaw || '');
    if (!end) return null;
    return `${start}-${end}`;
  };

  // 识别经文引用的正则表达式（与web端一致）
  const BIBLE_REFERENCE_REGEX = new RegExp(
    `[《【（]?([A-Za-z\\u4e00-\\u9fa5]+?)(?=[》】）]?[ \\t\\u3000]*第?[ \\t\\u3000]*${BIBLE_CHAPTER_TOKEN}[ \\t\\u3000]*[章篇]?)[》】）]?[ \\t\\u3000]*第?[ \\t\\u3000]*(${BIBLE_CHAPTER_TOKEN})[ \\t\\u3000]*[章篇]?(?:[ \\t\\u3000]*第?[ \\t\\u3000]*(?:[:：][ \\t\\u3000]*|[ \\t\\u3000]+)?(${BIBLE_VERSE_TOKEN})[ \\t\\u3000]*[节]?)?(?:[ \\t\\u3000]*[，,;；][ \\t\\u3000]*(?:第?[ \\t\\u3000]*${BIBLE_CHAPTER_TOKEN}[ \\t\\u3000]*[章篇]?[ \\t\\u3000]*)?(?:[:：][ \\t\\u3000]*|[ \\t\\u3000]+)?${BIBLE_VERSE_TOKEN})*[ \\t\\u3000]*[》】）]?`,
    'g'
  );

  const processHTMLWithBibleLinks = (html: string) => {
    // 在HTML中查找文本节点并添加经文链接
    // 需要避免处理已经在标签内的文本
    return html.replace(/>([^<]+)</g, (match, text) => {
      const processedText = text.replace(BIBLE_REFERENCE_REGEX, (match: string, book: string, chapter: string, versePart: string) => {
        let normalizedBook = String(book || '').trim();
        const normalizedChapter = normalizeBibleNumberToken(String(chapter || ''));
        
        // 验证书卷名是否有效，如果不有效则尝试从左截取找有效后缀
        // 去除书名尾部的“第”字（正则贪婪匹配可能吞入）
        if (normalizedBook.endsWith('第')) {
          normalizedBook = normalizedBook.slice(0, -1);
        }
        let bookPrefix = '';
        if (!normalizedBook || !normalizedChapter) return match;
        if (!VALID_BOOK_NAMES.has(normalizedBook)) {
          let found = false;
          for (let i = 1; i < normalizedBook.length; i++) {
            const suffix = normalizedBook.substring(i);
            if (VALID_BOOK_NAMES.has(suffix)) {
              bookPrefix = normalizedBook.substring(0, i);
              normalizedBook = suffix;
              found = true;
              break;
            }
          }
          if (!found) return match;
        }

        const trimmedMatch = match.trim();
        const bracketMatch = trimmedMatch.match(/^([《【（])([\s\S]*)([》】）])$/);
        const hasBrackets = !!bracketMatch;
        let innerText = hasBrackets && bracketMatch ? bracketMatch[2].trim() : trimmedMatch;

        // 去除链接文本中的前缀，避免重复
        if (bookPrefix && innerText.startsWith(bookPrefix)) {
          innerText = innerText.substring(bookPrefix.length);
        }

        // 拆分同卷多个引用，保留分隔符
        // 逗号(,，)：同一章内的不同节；分号(;；)：不同章
        const parts = innerText.split(/([，,;；])/);

        let firstSegmentHandled = false;
        let lastSeparator = '';
        let currentChapter = normalizedChapter;
        const linkedParts = parts.map((part: string) => {
          const trimmed = part.trim();
          if (!trimmed) return part;
          if (/^[，,;；]$/.test(trimmed)) {
            lastSeparator = trimmed;
            return part;
          }

          if (!firstSegmentHandled) {
            firstSegmentHandled = true;
            currentChapter = normalizedChapter;
            if (versePart) {
              const cleanedVersePart = normalizeVersePart(String(versePart));
              if (!cleanedVersePart) return match;
              const normalizedRef = `${normalizedBook}${normalizedChapter}:${cleanedVersePart}`
                .replace(/：/g, ':');
              return `<a href="#bible:${encodeURIComponent(normalizedRef)}" data-bible-ref="${encodeURIComponent(normalizedRef)}">${part}</a>`;
            } else {
              const normalizedRef = `${normalizedBook}${normalizedChapter}`
                .replace(/：/g, ':');
              return `<a href="#bible:${encodeURIComponent(normalizedRef)}" data-bible-ref="${encodeURIComponent(normalizedRef)}">${part}</a>`;
            }
          }

          const isComma = lastSeparator === ',' || lastSeparator === '，';

          // 逗号后的裸数字或数字范围（如 14 或 14-15）→ 同章的节号
          if (isComma && BARE_VERSE_RANGE_RE.test(trimmed)) {
            const segVersePart = normalizeVersePart(trimmed);
            if (!segVersePart) return part;
            const normalizedRef = `${normalizedBook}${currentChapter}:${segVersePart}`.replace(/：/g, ':');
            return `<a href="#bible:${encodeURIComponent(normalizedRef)}" data-bible-ref="${encodeURIComponent(normalizedRef)}">${part}</a>`;
          }

          const segmentMatch = trimmed.match(SEGMENT_REFERENCE_REGEX);
          if (!segmentMatch) {
            return part;
          }

          // 分号或带冒号的格式 → 可能换章
          if (segmentMatch[1]) {
            const normalizedSegChapter = normalizeBibleNumberToken(segmentMatch[1]);
            if (!normalizedSegChapter) return part;
            currentChapter = normalizedSegChapter;
          }
          const segChapter = currentChapter.trim();
          const segVersePart = segmentMatch[2] ? normalizeVersePart(segmentMatch[2]) : '';
          if (segmentMatch[2] && !segVersePart) return part;
          const normalizedRef = segVersePart
            ? `${normalizedBook}${segChapter}:${segVersePart}`.replace(/：/g, ':')
            : `${normalizedBook}${segChapter}`.replace(/：/g, ':');
          return `<a href="#bible:${encodeURIComponent(normalizedRef)}" data-bible-ref="${encodeURIComponent(normalizedRef)}">${part}</a>`;
        });

        const linkedText = linkedParts.join('');
        const result = hasBrackets && bracketMatch ? `${bracketMatch[1]}${linkedText}${bracketMatch[3]}` : linkedText;
        return bookPrefix + result;
      });
      
      return `>${processedText}<`;
    });
  };

  const htmlContent = useMemo(() => {
      if (!post) return '';
      
      const renderer = new marked.Renderer();
      let headingCount = 0;
      // @ts-ignore
      renderer.heading = function ({ tokens, depth }) {
          const id = `heading-${headingCount++}`;
          // @ts-ignore
          const text = this.parser ? this.parser.parseInline(tokens) : (tokens.map(t => t.text).join(''));
          return `<h${depth} id="${id}">${text}</h${depth}>`;
      };
      
      // 先用marked解析markdown
      const parsedHTML = marked.parse(post.content, { renderer }) as string;
      
      // 然后在HTML中添加经文链接
      return processHTMLWithBibleLinks(parsedHTML);
  }, [post]);

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
            y: y, 
            animated: true 
        });
    }
  };

  return (
    <>
      {stackScreen}
      <View className="flex-1 bg-white dark:bg-black">
        {/* Progress Bar */}
        <View className="absolute top-0 left-0 right-0 z-50">
          <View className="h-1 bg-gray-200 dark:bg-gray-800">
            <View 
              className="h-full bg-blue-600 dark:bg-blue-500" 
              style={{ width: `${scrollProgress}%` }}
            />
          </View>
        </View>
        
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

            {/* Nav Buttons */}
            <View className="flex-row justify-between px-4 pb-8 mb-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                {newerPostId ? (
                <TouchableOpacity 
                    onPress={() => router.push(`/post/${newerPostId}`)}
                    className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-3 rounded-xl flex-1 mr-2 shadow-sm"
                >
                    <IconSymbol name="chevron.left" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <View className="ml-2">
                        <Text className="text-xs text-slate-400 dark:text-slate-500">上一篇</Text>
                        <Text className="text-slate-700 dark:text-slate-300 font-medium" numberOfLines={1}>较新的文章</Text>
                    </View>
                </TouchableOpacity>
                ) : <View className="flex-1 mr-2" />}
                
                {olderPostId ? (
                <TouchableOpacity 
                    onPress={() => router.push(`/post/${olderPostId}`)}
                    className="flex-row items-center justify-end bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-3 rounded-xl flex-1 ml-2 shadow-sm"
                >
                    <View className="mr-2 items-end">
                        <Text className="text-xs text-slate-400 dark:text-slate-500">下一篇</Text>
                        <Text className="text-slate-700 dark:text-slate-300 font-medium" numberOfLines={1}>较旧的文章</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>
                ) : <View className="flex-1 ml-2" />}
            </View>
        </ScrollView>

        {/* Floating TOC Button */}
        {toc.length > 0 && (
            <Pressable 
                className="absolute bottom-8 right-6 bg-blue-600 p-4 rounded-full shadow-lg"
                style={{ zIndex: 999, elevation: 10 }}
                onPress={() => setTocVisible(true)}
            >
                <IconSymbol name="list.bullet" size={24} color="white" />
            </Pressable>
        )}

        {/* TOC Modal */}
        <Modal
            visible={tocVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setTocVisible(false)}
        >
            <View className="flex-1 justify-end">
                <Pressable 
                    className="absolute inset-0" 
                    onPress={() => setTocVisible(false)}
                />
                <View className="bg-slate-100 dark:bg-slate-900 rounded-t-2xl h-[70%] p-4 shadow-2xl border-t border-slate-200 dark:border-slate-800">
                    <View className="flex-row justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">目录</Text>
                            <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 8, padding: 2, marginLeft: 8 }}>
                                <RNTouchableOpacity 
                                    onPress={() => setTocMaxLevel(2)}
                                    style={{
                                        paddingHorizontal: 8, 
                                        paddingVertical: 4, 
                                        borderRadius: 6,
                                        backgroundColor: tocMaxLevel === 2 ? (isDark ? '#334155' : '#fff') : 'transparent',
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: tocMaxLevel === 2 ? 'bold' : 'normal', color: tocMaxLevel === 2 ? (isDark ? '#fff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b') }}>简</Text>
                                </RNTouchableOpacity>
                                <RNTouchableOpacity 
                                    onPress={() => setTocMaxLevel(3)}
                                    style={{
                                        paddingHorizontal: 8, 
                                        paddingVertical: 4, 
                                        borderRadius: 6,
                                        backgroundColor: tocMaxLevel === 3 ? (isDark ? '#334155' : '#fff') : 'transparent',
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: tocMaxLevel === 3 ? 'bold' : 'normal', color: tocMaxLevel === 3 ? (isDark ? '#fff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b') }}>中</Text>
                                </RNTouchableOpacity>
                                <RNTouchableOpacity 
                                    onPress={() => setTocMaxLevel(6)}
                                    style={{
                                        paddingHorizontal: 8, 
                                        paddingVertical: 4, 
                                        borderRadius: 6,
                                        backgroundColor: tocMaxLevel === 6 ? (isDark ? '#334155' : '#fff') : 'transparent',
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: tocMaxLevel === 6 ? 'bold' : 'normal', color: tocMaxLevel === 6 ? (isDark ? '#fff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b') }}>详</Text>
                                </RNTouchableOpacity>
                            </View>
                        </View>
                        <Pressable onPress={() => setTocVisible(false)}>
                            <IconSymbol name="xmark.circle.fill" size={24} color="#94a3b8" />
                        </Pressable>
                    </View>
                    <FlatList
                        ref={tocFlatListRef}
                        data={filterToc(toc)}
                        keyExtractor={item => item.key}
                        onScrollToIndexFailed={(info) => {
                            // Fallback if scrollToIndex fails
                            setTimeout(() => {
                                tocFlatListRef.current?.scrollToOffset({
                                    offset: info.averageItemLength * info.index,
                                    animated: true,
                                });
                            }, 100);
                        }}
                        renderItem={({ item, index }) => {
                            // Determine if this is the current heading
                            const originalIndex = toc.findIndex(t => t.key === item.key);
                            const headingY = headerPositionsRef.current[originalIndex];
                            
                            // Find which heading contains the current scroll position
                            let currentHeadingIndex = -1;
                            for (let i = toc.length - 1; i >= 0; i--) {
                                const y = headerPositionsRef.current[i];
                                if (y !== undefined && y <= currentScrollY.current + 100) {
                                    currentHeadingIndex = i;
                                    break;
                                }
                            }
                            
                            // Determine if this heading should be highlighted
                            let isCurrent = false;
                            
                            if (currentHeadingIndex >= 0 && headingY !== undefined) {
                                // Find the appropriate ancestor heading based on current filter level
                                // Start from the current heading and walk backwards to find the closest heading at or below tocMaxLevel
                                let targetHeadingIndex = currentHeadingIndex;
                                
                                // If current heading level is higher than filter, find the containing heading at filter level
                                while (targetHeadingIndex >= 0 && toc[targetHeadingIndex].level > tocMaxLevel) {
                                    targetHeadingIndex--;
                                }
                                
                                // Now find the highest level (lowest number) heading at or below tocMaxLevel that contains current position
                                let ancestorIndex = targetHeadingIndex;
                                for (let i = targetHeadingIndex - 1; i >= 0; i--) {
                                    if (toc[i].level <= tocMaxLevel) {
                                        // Check if this heading is still an ancestor (not a sibling or after current position)
                                        const nextSameLevelIndex = toc.findIndex((h, idx) => 
                                            idx > i && h.level <= toc[i].level
                                        );
                                        
                                        if (nextSameLevelIndex === -1 || nextSameLevelIndex > currentHeadingIndex) {
                                            // This is an ancestor
                                            if (toc[i].level < toc[ancestorIndex].level) {
                                                ancestorIndex = i;
                                            }
                                        } else {
                                            // This heading ends before current position, stop looking
                                            break;
                                        }
                                    }
                                }
                                
                                isCurrent = (originalIndex === ancestorIndex);
                            }
                            
                            return (
                                <RNTouchableOpacity 
                                    style={{
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
                                        paddingHorizontal: 8,
                                        marginHorizontal: -8,
                                        backgroundColor: isCurrent ? (isDark ? '#1e293b' : '#f1f5f9') : 'transparent',
                                    }}
                                    onPress={() => {
                                        scrollToHeader(originalIndex);
                                    }}
                                >
                                    <Text 
                                        style={{ 
                                            marginLeft: (item.level - 1) * 16,
                                            color: isCurrent ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#cbd5e1' : '#475569'),
                                            fontWeight: isCurrent ? 'bold' : 'normal',
                                        }}
                                    >
                                        {item.text}
                                    </Text>
                                </RNTouchableOpacity>
                            );
                        }}
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
                <Pressable 
                    className="absolute inset-0" 
                    onPress={() => setSettingsVisible(false)}
                />
                <View className="bg-slate-100 dark:bg-slate-900 rounded-t-2xl p-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 pb-10">
                    <View className="flex-row justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">阅读设置</Text>
                        <Pressable onPress={() => setSettingsVisible(false)}>
                            <IconSymbol name="xmark.circle.fill" size={24} color="#94a3b8" />
                        </Pressable>
                    </View>
                    
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-base text-slate-700 dark:text-slate-300 font-medium">字体大小</Text>
                        <Text className="text-slate-500 dark:text-slate-400">{(fontSizeScale * 100).toFixed(0)}%</Text>
                    </View>
                    
                    <View className="flex-row items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                        <Pressable 
                            onPress={() => changeFontSize(-0.1)}
                            className="p-3 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                        >
                            <Text className="text-slate-900 dark:text-white text-lg font-bold">A-</Text>
                        </Pressable>
                        
                        <View className="flex-1 items-center">
                             <Text className="text-slate-900 dark:text-white font-serif" style={{ fontSize: 18 * fontSizeScale }}>预览 Text</Text>
                        </View>
                        <Pressable 
                            onPress={() => changeFontSize(0.1)}
                            className="p-3 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                        >
                            <Text className="text-slate-900 dark:text-white text-lg font-bold">A+</Text>
                        </Pressable>
                    </View>
                    
                    {/* 高亮管理 */}
                    {highlights.length > 0 && (
                      <View className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <Text className="text-base text-slate-700 dark:text-slate-300 font-medium mb-3">我的高亮 ({highlights.length})</Text>
                        {highlights.map((highlight) => (
                          <View key={highlight.id} className="mb-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <Text className="text-slate-900 dark:text-white mb-2 leading-relaxed" numberOfLines={3}>
                              {highlight.text}
                            </Text>
                            <View className="flex-row gap-2">
                              <TouchableOpacity
                                onPress={() => handleCopyHighlight(highlight.text)}
                                className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg py-2 items-center"
                              >
                                <Text className="text-blue-600 dark:text-blue-400 text-xs font-medium">复制</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleRemoveHighlight(highlight.id)}
                                className="flex-1 bg-red-100 dark:bg-red-900/30 rounded-lg py-2 items-center"
                              >
                                <Text className="text-red-600 dark:text-red-400 text-xs font-medium">删除</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
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
                    <Pressable 
                        className="p-3 bg-black/40 rounded-full backdrop-blur-md"
                        onPress={() => setViewerVisible(false)}
                    >
                        <IconSymbol name="xmark" size={20} color="white" />
                    </Pressable>
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
                        <Pressable 
                            className="p-5 bg-black/50 rounded-full backdrop-blur-md active:bg-black/70"
                            onPress={handleRotateLeft}
                        >
                            <IconSymbol name="rotate.left" size={28} color="white" />
                        </Pressable>
                        <Pressable 
                            className="p-5 bg-black/50 rounded-full backdrop-blur-md active:bg-black/70"
                            onPress={handleRotateRight}
                        >
                            <IconSymbol name="rotate.right" size={28} color="white" />
                        </Pressable>
                    </View>
                </View>
            )}

            onLongPress={() => setControlsVisible(!controlsVisible)}
        />
        
        {/* Bible Verse Modal */}
        <BibleVerseModal
          isOpen={showBibleModal}
          onClose={() => setShowBibleModal(false)}
          reference={selectedBibleReference}
          version={bibleVersion}
          onVersionChange={setBibleVersion}
        />
      </View>
    </>
  );
}
