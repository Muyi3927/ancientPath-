import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableWithoutFeedback,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import {
  getBooks,
  getVerses,
  BibleBook,
  BibleVerse,
  setActiveBibleVersion,
  BibleVersionKey,
} from '../../services/BibleDatabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGHLIGHT_STORAGE_KEY = 'bible_highlights';
const READING_HISTORY_KEY = 'bible_reading_history';

export default function BibleScreen() {
  const insets = useSafeAreaInsets();
  const [safeTop, setSafeTop] = useState(0);
  const [safeBottom, setSafeBottom] = useState(0);

  useEffect(() => {
    if (insets.top > 0) {
      setSafeTop(insets.top);
    }
    if (insets.bottom > 0) {
      setSafeBottom(insets.bottom);
    }
  }, [insets.top, insets.bottom]);

  const navigation = useNavigation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [currentBook, setCurrentBook] = useState<BibleBook | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBookModal, setShowBookModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [bookTab, setBookTab] = useState<'old' | 'new'>('old');
  const [fontScale, setFontScale] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [highlightedVerses, setHighlightedVerses] = useState<Record<string, boolean>>({});
  const [translation, setTranslation] = useState<BibleVersionKey>('cuv');
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [readingHistory, setReadingHistory] = useState<{bookSN: number, chapter: number, timestamp: number, bookName: string}[]>([]);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVersesForAction, setSelectedVersesForAction] = useState<Set<number>>(new Set());

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const baseFontSize = 18 * fontScale;
  const verseLineHeight = 28 * fontScale;

  useEffect(() => {
    // Animate Controls
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: showControls ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: showControls ? 0 : -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showControls]);

  const translationOptions: Record<BibleVersionKey, { label: string; description: string }> = {
    cuv: { label: '和合本', description: 'Chinese Union Version' },
    cnv: { label: '新译本', description: 'Chinese New Version' },
    asv: { label: 'ASV', description: 'American Standard Version' },
  };
  // const translationOrder: BibleVersionKey[] = ['cuv', 'cnv', 'asv'];
  const translationOrder: BibleVersionKey[] = ['cuv', 'asv']; // Temporarily hidden CNV

  const getVerseKey = (verse: BibleVerse) => `${verse.VolumeSN}-${verse.ChapterSN}-${verse.VerseSN}`;

  const persistHighlights = async (data: Record<string, boolean>) => {
    setHighlightedVerses(data);
    try {
      await AsyncStorage.setItem(HIGHLIGHT_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存高亮状态失败', error);
    }
  };

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const highlightRaw = await AsyncStorage.getItem(HIGHLIGHT_STORAGE_KEY);
        if (highlightRaw) {
          setHighlightedVerses(JSON.parse(highlightRaw));
        }
      } catch (error) {
        console.error('加载本地经文状态失败', error);
      }
    };

    loadStoredData();
  }, []);

  // Save reading history
  useEffect(() => {
    if (currentBook && currentChapter) {
      const saveHistory = async () => {
        try {
          const newItem = {
            bookSN: currentBook.SN,
            chapter: currentChapter,
            bookName: currentBook.FullName,
            timestamp: Date.now()
          };
          
          const historyJson = await AsyncStorage.getItem(READING_HISTORY_KEY);
          let history = historyJson ? JSON.parse(historyJson) : [];
          
          // Handle legacy format (single object) or empty
          if (!Array.isArray(history)) {
             history = historyJson ? [JSON.parse(historyJson)] : [];
          }

          // Remove duplicates (same book and chapter)
          history = history.filter((h: any) => !(h.bookSN === newItem.bookSN && h.chapter === newItem.chapter));
          
          // Add new item to top
          history.unshift(newItem);
          
          // Limit to 20 items
          if (history.length > 20) history = history.slice(0, 20);
          
          await AsyncStorage.setItem(READING_HISTORY_KEY, JSON.stringify(history));
          setReadingHistory(history);
        } catch (e) {
          console.error('保存阅读历史失败', e);
        }
      };
      saveHistory();
    }
  }, [currentBook, currentChapter]);

  useEffect(() => {
    const init = async () => {
        let preferredBookSN: number | undefined;
        let preferredChapter: number | undefined;
        
        try {
            const historyJson = await AsyncStorage.getItem(READING_HISTORY_KEY);
            if (historyJson) {
                const history = JSON.parse(historyJson);
                if (Array.isArray(history)) {
                    if (history.length > 0) {
                        preferredBookSN = history[0].bookSN;
                        preferredChapter = history[0].chapter;
                        setReadingHistory(history);
                    }
                } else {
                    // Legacy format support
                    preferredBookSN = history.bookSN;
                    preferredChapter = history.chapter;
                }
            }
        } catch (e) {
            console.error('加载阅读历史失败', e);
        }
        
        await loadBooks({ preferredBookSN, preferredChapter });
    };
    init();
  }, []);

  useEffect(() => {
    if (currentBook) {
      loadVerses(currentBook.SN, currentChapter);
    }
  }, [currentBook, currentChapter]);

  const loadBooks = async (
    options?: { preferredBookSN?: number; preferredChapter?: number }
  ): Promise<BibleBook | null> => {
    try {
      const data = await getBooks();
      setBooks(data);
      if (data.length > 0) {
        let nextBook = data[0];
        if (options?.preferredBookSN) {
          const matched = data.find(b => b.SN === options.preferredBookSN);
          if (matched) {
            nextBook = matched;
          }
        }
        setCurrentBook(nextBook);
        const nextChapter = options?.preferredChapter && nextBook
          ? Math.min(options.preferredChapter, nextBook.ChapterNumber)
          : 1;
        setCurrentChapter(nextChapter);
        return nextBook;
      } else {
        setCurrentBook(null);
        setVerses([]);
        return null;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const loadVerses = async (bookId: number, chapter: number) => {
    setLoading(true);
    try {
      const data = await getVerses(bookId, chapter);
      setVerses(data);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustFont = () => {
    setFontScale(prev => {
      const next = prev >= 1.5 ? 1 : parseFloat((prev + 0.25).toFixed(2));
      return next;
    });
  };

  const handleTranslationChange = async (version: BibleVersionKey) => {
    if (version === translation) {
      setShowTranslationModal(false);
      return;
    }

    const preferredBookSN = currentBook?.SN;
    const preferredChapter = currentChapter;
    const previousTranslation = translation;

    setShowTranslationModal(false);
    setLoading(true);
    setVerses([]);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    try {
      await setActiveBibleVersion(version);
      setTranslation(version);
      const nextBook = await loadBooks({
        preferredBookSN: preferredBookSN ?? undefined,
        preferredChapter,
      });
      if (nextBook) {
        setBookTab(nextBook.NewOrOld === 0 ? 'old' : 'new');
      }
      if (!nextBook) {
        setLoading(false);
      }
    } catch (error) {
      console.error('切换译本失败', error);
      setTranslation(previousTranslation);
      Alert.alert('切换失败', '请稍后再试');
      setLoading(false);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(c => c - 1);
    } else {
      if (currentBook && currentBook.SN > 1) {
        const prevBook = books.find(b => b.SN === currentBook.SN - 1);
        if (prevBook) {
          setCurrentBook(prevBook);
          setCurrentChapter(prevBook.ChapterNumber);
        }
      }
    }
  };

  const toggleControls = () => {
    if (showBookModal || showChapterModal || showVerseModal || showTranslationModal || showHistoryModal || isSelectionMode) {
      return;
    }
    setShowControls(prev => !prev);
  };

  useEffect(() => {
    if (showBookModal || showChapterModal || showVerseModal || showTranslationModal || showHistoryModal) {
      setShowControls(true);
    }
  }, [showBookModal, showChapterModal, showVerseModal, showTranslationModal, showHistoryModal]);

  useEffect(() => {
    if (isSelectionMode) {
      setShowControls(false);
    }
  }, [isSelectionMode]);

  useEffect(() => {
    if (verses.length > 0) {
      setSelectedVerse(verses[0].VerseSN);
    } else {
      setSelectedVerse(null);
    }
  }, [verses]);
  const handleNextChapter = () => {
    if (currentBook && currentChapter < currentBook.ChapterNumber) {
      setCurrentChapter(c => c + 1);
    } else {
      if (currentBook && currentBook.SN < 66) {
        const nextBook = books.find(b => b.SN === currentBook.SN + 1);
        if (nextBook) {
          setCurrentBook(nextBook);
          setCurrentChapter(1);
        }
      }
    }
  };

  const scrollToVerse = (verseNumber: number) => {
    const index = verses.findIndex(v => v.VerseSN === verseNumber);
    if (index !== -1) {
      setSelectedVerse(verseNumber);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.05 });
      });
    }
  };

  const handleCopySelected = async () => {
    try {
      const sortedSNs = Array.from(selectedVersesForAction).sort((a, b) => a - b);
      if (sortedSNs.length === 0) return;

      const selectedVerseObjects = verses.filter(v => selectedVersesForAction.has(v.VerseSN));
      const textContent = selectedVerseObjects.map(v => v.Lection.trim()).join('\n');
      
      const bookLabel = currentBook?.ShortName || currentBook?.FullName || '';
      const versionLabel = translationOptions[translation].label;
      
      // Format: 【BookAbbr Chapter:Start-End Version】
      let reference = '';
      if (sortedSNs.length === 1) {
        reference = `【${bookLabel} ${currentChapter}:${sortedSNs[0]} ${versionLabel}】`;
      } else {
        // Simple range check - assumes contiguous selection for simplicity, or just lists start-end
        // If non-contiguous, it might be better to list them, but user asked for "几-几节"
        // Let's just take min and max for the range format as requested
        const min = sortedSNs[0];
        const max = sortedSNs[sortedSNs.length - 1];
        reference = `【${bookLabel} ${currentChapter}:${min}-${max} ${versionLabel}】`;
      }

      const formatted = `${textContent}\n${reference}`;
      await Clipboard.setStringAsync(formatted);
      Alert.alert('已复制', '经文内容已复制到剪贴板');
      exitSelectionMode();
    } catch (error) {
      Alert.alert('复制失败', '请稍后再试');
    }
  };

  const handleHighlightSelected = async () => {
    const nextState = { ...highlightedVerses };
    let hasChanges = false;

    selectedVersesForAction.forEach(sn => {
      const verse = verses.find(v => v.VerseSN === sn);
      if (verse) {
        const key = getVerseKey(verse);
        // Toggle logic: if any are unhighlighted, highlight them? 
        // Or just toggle each? Usually "Highlight" button implies "Make Highlighted".
        // Let's assume we want to highlight them. If already highlighted, maybe unhighlight?
        // Let's just toggle for now based on the first one or just set to true.
        // User said "Highlight button", usually means "Add Highlight".
        // Let's set to true.
        if (!nextState[key]) {
          nextState[key] = true;
          hasChanges = true;
        }
      }
    });

    // If no changes (all were already highlighted), maybe user wants to unhighlight?
    // Let's keep it simple: Always add highlight. 
    // If user wants to remove, they can tap individually or we can add "Remove Highlight" button later.
    // But wait, user said "Highlight" button.
    // Let's just toggle the first one's state for all? No, that's confusing.
    // Let's just set all to true.
    if (!hasChanges) {
       // If all are already highlighted, let's unhighlight them all.
       selectedVersesForAction.forEach(sn => {
         const verse = verses.find(v => v.VerseSN === sn);
         if (verse) {
           const key = getVerseKey(verse);
           delete nextState[key];
         }
       });
    }

    await persistHighlights(nextState);
    exitSelectionMode();
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedVersesForAction(new Set());
  };

  const onVersePress = (verse: BibleVerse) => {
    if (isSelectionMode) {
      const newSet = new Set(selectedVersesForAction);
      if (newSet.has(verse.VerseSN)) {
        newSet.delete(verse.VerseSN);
        if (newSet.size === 0) {
          exitSelectionMode();
          return;
        }
      } else {
        newSet.add(verse.VerseSN);
      }
      setSelectedVersesForAction(newSet);
    } else {
      setSelectedVerse(verse.VerseSN);
      toggleControls();
    }
  };

  const onVerseLongPress = (verse: BibleVerse) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedVersesForAction(new Set([verse.VerseSN]));
      // Haptic feedback could be nice here
    } else {
      // Already in selection mode, just toggle
      onVersePress(verse);
    }
  };

  const renderVerse = ({ item }: { item: BibleVerse }) => {
    const verseKey = getVerseKey(item);
    const isHighlighted = !!highlightedVerses[verseKey];
    const isSelected = selectedVersesForAction.has(item.VerseSN);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        className={`flex-row mb-3 rounded-lg items-start pr-2 ${isHighlighted ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/60' : ''}`.trim()}
        onPress={() => onVersePress(item)}
        onLongPress={() => onVerseLongPress(item)}
      >
        <Text
              className="text-gray-400 font-medium text-right"
          style={{
                width: 36,
            fontSize: 12 * fontScale,
            lineHeight: verseLineHeight,
            paddingVertical: 4,
            textAlignVertical: 'top',
                paddingLeft: 6,
          }}
        >
          {item.VerseSN}
        </Text>
        <Text
          className="flex-1 text-gray-800 dark:text-gray-200 font-serif"
          style={{
            fontSize: baseFontSize,
            lineHeight: verseLineHeight,
            paddingVertical: 4,
            paddingRight: 6,
            paddingLeft: 4,
            textDecorationLine: isSelected ? 'underline' : 'none',
            textDecorationStyle: 'dashed',
            textDecorationColor: isDark ? '#60a5fa' : '#93c5fd',
          }}
        >
          {item.Lection}
        </Text>
      </TouchableOpacity>
    );
  };

  const oldTestamentBooks = books.filter(b => b.NewOrOld === 0);
  const newTestamentBooks = books.filter(b => b.NewOrOld === 1);

  return (
    <View
      className="flex-1 bg-white dark:bg-black"
    >
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      {/* Spacer for Status Bar Area - Always render with fixed height */}
      <View style={{ height: safeTop, backgroundColor: isDark ? '#000' : '#fff', width: '100%' }} />

      {/* Persistent Info Bar */}
      <View className="h-12 justify-center items-center bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 z-10">
         <Text className="text-base font-bold text-gray-500 dark:text-gray-400">
             {translationOptions[translation].label} · {currentBook?.FullName} {currentChapter}章
         </Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <TouchableWithoutFeedback onPress={toggleControls}>
            <View className="flex-1">
              <FlatList
                ref={flatListRef}
                data={verses}
                renderItem={renderVerse}
                keyExtractor={item => item.ID.toString()}
                extraData={{ selectedVerse, highlightedVerses }}
                contentContainerStyle={{
                  paddingHorizontal: 0,
                  paddingBottom: 80 + safeBottom, // Add extra padding for the bottom bar
                }}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={() => {
                  const hasPrev = currentBook && (currentBook.SN > 1 || currentChapter > 1);
                  const hasNext = currentBook && (currentBook.SN < 66 || currentChapter < currentBook.ChapterNumber);
                  
                  return (
                    <View className="px-4 pt-6 pb-12">
                      <View className="flex-row justify-between bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
                        <TouchableOpacity
                          onPress={handlePrevChapter}
                          disabled={!hasPrev}
                          className="flex-row items-center"
                        >
                          <IconSymbol name="chevron.left" size={18} color={hasPrev ? "#2563eb" : "#9ca3af"} />
                          <Text className={`ml-1 font-semibold ${hasPrev ? 'text-blue-600' : 'text-gray-400'}`}>上一章</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleNextChapter}
                          disabled={!hasNext}
                          className="flex-row items-center"
                        >
                          <Text className={`mr-1 font-semibold ${hasNext ? 'text-blue-600' : 'text-gray-400'}`}>下一章</Text>
                          <IconSymbol name="chevron.right" size={18} color={hasNext ? "#2563eb" : "#9ca3af"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                onScrollToIndexFailed={({ index, averageItemLength }) => {
                  if (averageItemLength) {
                    flatListRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true });
                  }
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>

      {/* Controls Layer (Header + Panels) */}
      <Animated.View 
        className="absolute top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-sm"
        style={{ 
          paddingTop: safeTop,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
          {/* Header */}
          <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row flex-wrap items-center gap-3">
              <TouchableOpacity
                className="flex-row items-center px-3 py-2 rounded-full bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-600"
                onPress={() => setShowTranslationModal(true)}
              >
                <Text className="text-base font-bold text-orange-700 dark:text-orange-200 mr-1">
                  {translationOptions[translation].label}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={isDark ? '#fdba74' : '#c2410c'} />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-3 py-2 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700"
                onPress={() => setShowBookModal(true)}
              >
                <Text className="text-base font-bold text-blue-700 dark:text-blue-200 mr-1">
                  {currentBook?.FullName || '加载中...'}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={isDark ? '#93c5fd' : '#1d4ed8'} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-3 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700"
                onPress={() => setShowChapterModal(true)}
              >
                <Text className="text-base font-bold text-emerald-700 dark:text-emerald-200 mr-1">
                  第 {currentChapter} 章
                </Text>
                <IconSymbol name="chevron.down" size={12} color={isDark ? '#a7f3d0' : '#047857'} />
              </TouchableOpacity>
            </View>

            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <TouchableOpacity
                className={`flex-row items-center px-3 py-2 rounded-full border ${verses.length === 0 ? 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700' : 'bg-purple-100 border-purple-200 dark:bg-purple-900/40 dark:border-purple-700'}`}
                onPress={() => setShowVerseModal(true)}
                disabled={verses.length === 0}
              >
                <Text className={`text-base font-bold mr-1 ${verses.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-purple-700 dark:text-purple-200'}`}>
                  第 {selectedVerse ?? 1} 节
                </Text>
                <IconSymbol name="chevron.down" size={12} color={verses.length === 0 ? (isDark ? '#6b7280' : '#9ca3af') : (isDark ? '#c4b5fd' : '#6d28d9')} />
              </TouchableOpacity>
              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30"
                onPress={handleAdjustFont}
              >
                <Text className="text-base font-bold text-blue-600 dark:text-blue-300">A+</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800"
                onPress={() => setShowHistoryModal(true)}
              >
                <IconSymbol name="clock.fill" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* History Modal */}
          {showHistoryModal && (
            <View className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm max-h-96">
              <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">阅读历史</Text>
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <ScrollView className="px-4 pb-4">
                {readingHistory.length > 0 ? (
                  readingHistory.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.bookSN}-${item.chapter}-${index}`}
                      className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800"
                      onPress={() => {
                        if (currentBook?.SN !== item.bookSN) {
                           const book = books.find(b => b.SN === item.bookSN);
                           if (book) setCurrentBook(book);
                        }
                        setCurrentChapter(item.chapter);
                        setShowHistoryModal(false);
                      }}
                    >
                      <View>
                        <Text className="text-base font-medium text-gray-900 dark:text-white">
                          {item.bookName} 第 {item.chapter} 章
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </Text>
                      </View>
                      <IconSymbol name="chevron.right" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500 dark:text-gray-400">暂无阅读历史</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Translation Selection Panel */}
          {showTranslationModal && (
            <View className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
              <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">选择译本</Text>
                <TouchableOpacity onPress={() => setShowTranslationModal(false)}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View className="px-4 pb-4 gap-5">
                {translationOrder.map(version => {
                  const active = translation === version;
                  return (
                    <TouchableOpacity
                      key={version}
                      className={`px-4 py-3 rounded-2xl border ${active ? 'bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-500' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                      onPress={() => handleTranslationChange(version)}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-base font-semibold ${active ? 'text-orange-700 dark:text-orange-200' : 'text-gray-800 dark:text-gray-100'}`}>
                          {translationOptions[version].label}
                        </Text>
                        {active && <IconSymbol name="checkmark.circle.fill" size={20} color="#ea580c" />}
                      </View>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {translationOptions[version].description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Book Selection Panel */}
          {showBookModal && (
            <View className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
              <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">选择书卷</Text>
                <TouchableOpacity onPress={() => setShowBookModal(false)}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View className="flex-row px-4 pb-3 gap-3">
                <TouchableOpacity
                  className={`flex-1 py-2 items-center rounded-lg border ${bookTab === 'old' ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                  onPress={() => setBookTab('old')}
                >
                  <Text className={`font-bold ${bookTab === 'old' ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-200'}`}>旧约</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2 items-center rounded-lg border ${bookTab === 'new' ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                  onPress={() => setBookTab('new')}
                >
                  <Text className={`font-bold ${bookTab === 'new' ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-200'}`}>新约</Text>
                </TouchableOpacity>
              </View>
              <ScrollView className="max-h-80 px-4 pb-4">
                <View className="flex-row flex-wrap justify-between">
                  {(bookTab === 'old' ? oldTestamentBooks : newTestamentBooks).map(book => (
                    <TouchableOpacity
                      key={book.SN}
                      className={`w-[30%] mb-3 p-3 rounded-xl items-center border ${currentBook?.SN === book.SN ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                      onPress={() => {
                        setCurrentBook(book);
                        setCurrentChapter(1);
                        setShowBookModal(false);
                        setBookTab(book.NewOrOld === 0 ? 'old' : 'new');
                      }}
                    >
                      <Text className={`font-medium text-center ${currentBook?.SN === book.SN ? 'text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-200'}`}>
                        {book.FullName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Chapter Selection Panel */}
          {showChapterModal && currentBook && (
            <View className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
              <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">{currentBook.FullName} - 选择章节</Text>
                <TouchableOpacity onPress={() => setShowChapterModal(false)}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <ScrollView className="max-h-72 px-4 pb-4">
                <View className="flex-row flex-wrap gap-3 justify-center">
                  {Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                    <TouchableOpacity
                      key={num}
                      className={`w-14 h-14 rounded-2xl items-center justify-center border ${currentChapter === num ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-300' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                      onPress={() => {
                        setCurrentChapter(num);
                        setShowChapterModal(false);
                      }}
                    >
                      <Text className={`text-lg font-bold ${currentChapter === num ? 'text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-200'}`}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Verse Selection Panel */}
          {showVerseModal && verses.length > 0 && (
            <View className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
              <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">选择经节</Text>
                <TouchableOpacity onPress={() => setShowVerseModal(false)}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <ScrollView className="max-h-72 px-4 pb-4">
                <View className="flex-row flex-wrap gap-3 justify-center">
                  {verses.map(verse => (
                    <TouchableOpacity
                      key={verse.ID}
                      className={`w-14 h-14 rounded-2xl items-center justify-center border ${selectedVerse === verse.VerseSN ? 'bg-purple-600 border-purple-700 dark:bg-purple-500 dark:border-purple-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                      onPress={() => {
                        setShowVerseModal(false);
                        scrollToVerse(verse.VerseSN);
                      }}
                    >
                      <Text className={`text-lg font-bold ${selectedVerse === verse.VerseSN ? 'text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-200'}`}>
                        {verse.VerseSN}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </Animated.View>

      {/* Bottom Tab Bar (Custom) */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
        style={{
          paddingBottom: safeBottom,
          height: 60 + safeBottom,
          opacity: fadeAnim,
          transform: [{ 
            translateY: slideAnim.interpolate({
              inputRange: [-100, 0],
              outputRange: [60 + safeBottom, 0] 
            }) 
          }],
        }}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <View className="flex-row justify-around items-center h-[60px]">
          <TouchableOpacity 
            className="flex-1 items-center justify-center"
            onPress={() => router.push('/')}
          >
            <IconSymbol size={28} name="house.fill" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <Text style={{ color: Colors[colorScheme ?? 'light'].tabIconDefault, fontSize: 10, marginTop: 4 }}>首页</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-1 items-center justify-center"
          >
            <IconSymbol size={28} name="book.fill" color={Colors[colorScheme ?? 'light'].tint} />
            <Text style={{ color: Colors[colorScheme ?? 'light'].tint, fontSize: 10, marginTop: 4 }}>圣经</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 items-center justify-center"
            onPress={() => router.push('/categories')}
          >
            <IconSymbol size={28} name="folder.fill" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <Text style={{ color: Colors[colorScheme ?? 'light'].tabIconDefault, fontSize: 10, marginTop: 4 }}>分类</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Selection Action Bar */}
      {isSelectionMode && (
        <View 
          className="absolute bottom-8 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex-row justify-around items-center"
          style={{ paddingBottom: 16 }}
        >
          <TouchableOpacity 
            className="flex-1 items-center justify-center"
            onPress={handleCopySelected}
          >
            <IconSymbol name="doc.on.doc" size={28} color={Colors[colorScheme ?? 'light'].tint} />
            <Text className="text-sm mt-2 font-bold text-blue-600 dark:text-blue-400 text-center">复制</Text>
          </TouchableOpacity>
          
          <View className="w-[1px] h-10 bg-gray-200 dark:bg-gray-700 mx-4" />
          
          <TouchableOpacity 
            className="flex-1 items-center justify-center"
            onPress={handleHighlightSelected}
          >
            <IconSymbol name="highlighter" size={28} color={Colors[colorScheme ?? 'light'].tint} />
            <Text className="text-sm mt-2 font-bold text-blue-600 dark:text-blue-400 text-center">高亮</Text>
          </TouchableOpacity>

          <View className="w-[1px] h-10 bg-gray-200 dark:bg-gray-700 mx-4" />

          <TouchableOpacity 
            className="flex-1 items-center justify-center"
            onPress={exitSelectionMode}
          >
            <IconSymbol name="xmark" size={28} color={Colors[colorScheme ?? 'light'].icon} />
            <Text className="text-sm mt-2 font-bold text-gray-500 dark:text-gray-400 text-center">取消</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
