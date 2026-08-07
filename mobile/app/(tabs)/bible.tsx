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
  Modal,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import {
  getBooks,
  getVerses,
  searchVerses,
  BibleBook,
  BibleVerse,
  setActiveBibleVersion,
  BibleVersionKey,
  parseVerseLection,
} from '../../services/BibleDatabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const HIGHLIGHT_STORAGE_KEY = 'bible_highlights';
const READING_HISTORY_KEY = 'bible_reading_history';
const SEARCH_HISTORY_KEY = 'bible_search_history';
const MAX_SEARCH_HISTORY = 10;

// 圣经书卷简写映射表
const BOOK_SHORT_NAME_MAP: Record<string, string> = {
  // 中文书卷名 - 旧约
  '创世记': '创', '出埃及记': '出', '利未记': '利', '民数记': '民', '申命记': '申',
  '约书亚记': '书', '士师记': '士', '路得记': '得', '撒母耳记上': '撒上', '撒母耳记下': '撒下',
  '列王纪上': '王上', '列王纪下': '王下', '历代志上': '代上', '历代志下': '代下',
  '以斯拉记': '拉', '尼希米记': '尼', '以斯帖记': '斯',
  '约伯记': '伯', '诗篇': '诗', '箴言': '箴', '传道书': '传', '雅歌': '歌',
  '以赛亚书': '赛', '耶利米书': '耶', '耶利米哀歌': '哀', '以西结书': '结', '但以理书': '但',
  '何西阿书': '何', '约珥书': '珥', '阿摩司书': '摩', '俄巴底亚书': '俄', '约拿书': '拿',
  '弥迦书': '弥', '那鸿书': '鸿', '哈巴谷书': '哈', '西番雅书': '番', '哈该书': '该',
  '撒迦利亚书': '亚', '玛拉基书': '玛',
  // 中文书卷名 - 新约
  '马太福音': '太', '马可福音': '可', '路加福音': '路', '约翰福音': '约',
  '使徒行传': '徒', '罗马书': '罗',
  '哥林多前书': '林前', '哥林多后书': '林后', '加拉太书': '加', '以弗所书': '弗',
  '腓立比书': '腓', '歌罗西书': '西',
  '帖撒罗尼迦前书': '帖前', '帖撒罗尼迦后书': '帖后',
  '提摩太前书': '提前', '提摩太后书': '提后', '提多书': '多', '腓利门书': '门',
  '希伯来书': '来', '雅各书': '雅', '彼得前书': '彼前', '彼得后书': '彼后',
  '约翰壹书': '约一', '约翰贰书': '约二', '约翰叁书': '约三', '犹大书': '犹',
  '启示录': '启',
  
  // 英文书卷名 (ASV) - 旧约
  'Genesis': '创', 'Exodus': '出', 'Leviticus': '利', 'Numbers': '民', 'Deuteronomy': '申',
  'Joshua': '书', 'Judges': '士', 'Ruth': '得', 'I Samuel': '撒上', 'II Samuel': '撒下',
  'I Kings': '王上', 'II Kings': '王下', 'I Chronicles': '代上', 'II Chronicles': '代下',
  'Ezra': '拉', 'Nehemiah': '尼', 'Esther': '斯',
  'Job': '伯', 'Psalms': '诗', 'Proverbs': '箴', 'Ecclesiastes': '传', 'Song of Solomon': '歌',
  'Isaiah': '赛', 'Jeremiah': '耶', 'Lamentations': '哀', 'Ezekiel': '结', 'Daniel': '但',
  'Hosea': '何', 'Joel': '珥', 'Amos': '摩', 'Obadiah': '俄', 'Jonah': '拿',
  'Micah': '弥', 'Nahum': '鸿', 'Habakkuk': '哈', 'Zephaniah': '番', 'Haggai': '该',
  'Zechariah': '亚', 'Malachi': '玛',
  // 英文书卷名 (ASV) - 新约
  'Matthew': '太', 'Mark': '可', 'Luke': '路', 'John': '约',
  'Acts': '徒', 'Romans': '罗',
  'I Corinthians': '林前', 'II Corinthians': '林后', 'Galatians': '加', 'Ephesians': '弗',
  'Philippians': '腓', 'Colossians': '西',
  'I Thessalonians': '帖前', 'II Thessalonians': '帖后',
  'I Timothy': '提前', 'II Timothy': '提后', 'Titus': '多', 'Philemon': '门',
  'Hebrews': '来', 'James': '雅', 'I Peter': '彼前', 'II Peter': '彼后',
  'I John': '约一', 'II John': '约二', 'III John': '约三', 'Jude': '犹',
  'Revelation of John': '启',
};

// 获取书卷简写
const getBookShortName = (fullName: string): string => {
  return BOOK_SHORT_NAME_MAP[fullName] || fullName.charAt(0);
};

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
  const [fontScale, setFontScale] = useState(1.1);
  const [showControls, setShowControls] = useState(true);

  // Load saved font scale on component mount
  useEffect(() => {
    const loadFontScale = async () => {
      try {
        const savedScale = await AsyncStorage.getItem('bible_font_size_scale');
        if (savedScale) {
          setFontScale(parseFloat(savedScale));
        }
      } catch (e) {
        console.log('Error loading font scale', e);
      }
    };
    loadFontScale();
  }, []);

  // Load saved font scale on component mount
  useEffect(() => {
    const loadFontScale = async () => {
      try {
        const savedScale = await AsyncStorage.getItem('bible_font_size_scale');
        if (savedScale) {
          setFontScale(parseFloat(savedScale));
        }
      } catch (e) {
        console.log('Error loading font scale', e);
      }
    };
    loadFontScale();
  }, []);

  // Load saved font scale on component mount
  useEffect(() => {
    const loadFontScale = async () => {
      try {
        const savedScale = await AsyncStorage.getItem('bible_font_size_scale');
        if (savedScale) {
          setFontScale(parseFloat(savedScale));
        }
      } catch (e) {
        console.log('Error loading font scale', e);
      }
    };
    loadFontScale();
  }, []);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [highlightedVerses, setHighlightedVerses] = useState<Record<string, boolean>>({});
  const [translation, setTranslation] = useState<BibleVersionKey>('cuv');
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [readingHistory, setReadingHistory] = useState<{bookSN: number, chapter: number, timestamp: number, bookName: string}[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVersesForAction, setSelectedVersesForAction] = useState<Set<number>>(new Set());
  const [copyModeType, setCopyModeType] = useState<'range' | 'free'>('free');
  const [rangeAnchorId, setRangeAnchorId] = useState<number | null>(null);
  const [ncvUnlocked, setNcvUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 启动时读取新译本解锁状态
  useEffect(() => {
    AsyncStorage.getItem('ncv_unlocked').then(value => {
      if (value === 'true') setNcvUnlocked(true);
    });
  }, []);

  // Search State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHighlightVerseId, setSearchHighlightVerseId] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Touch tracking for smarter toggle
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const baseFontSize = 18 * fontScale;
  const verseLineHeight = 28 * fontScale;

  const [pendingScrollVerse, setPendingScrollVerse] = useState<number | null>(null);

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
    bilingual: { label: '中英对照', description: 'Chinese-English Bilingual' },
    asv: { label: 'ASV', description: 'American Standard Version' },
    ncv: { label: '新译本', description: 'New Chinese Version（内测）' },
  };
  const translationOrder: BibleVersionKey[] = ncvUnlocked ? ['cuv', 'bilingual', 'asv', 'ncv'] : ['cuv', 'bilingual', 'asv'];

  const handlePasswordSubmit = () => {
    if (passwordInput === '3927') {
      setNcvUnlocked(true);
      AsyncStorage.setItem('ncv_unlocked', 'true');
      setShowPasswordModal(false);
      setPasswordInput('');
      Alert.alert('解锁成功', '新译本已启用');
    } else {
      Alert.alert('密码错误', '请输入正确的口令');
      setPasswordInput('');
    }
  };

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
        
        // 加载搜索历史
        const searchHistoryRaw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (searchHistoryRaw) {
          setSearchHistory(JSON.parse(searchHistoryRaw));
        }
      } catch (error) {
        console.error('加载本地数据失败', error);
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

  const handleAdjustFont = async () => {
    setFontScale(prev => {
      const next = prev >= 1.5 ? 1 : parseFloat((prev + 0.25).toFixed(2));
      AsyncStorage.setItem('bible_font_size_scale', next.toString()).catch(console.error);
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
    setSearchHighlightVerseId(null); // 清除搜索高亮
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

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const deltaX = Math.abs(e.nativeEvent.pageX - touchStartX.current);
    const deltaY = Math.abs(e.nativeEvent.pageY - touchStartY.current);
    
    // Only toggle if the touch movement is very small (deliberate tap, not a scroll)
    if (deltaX < 10 && deltaY < 10) {
      toggleControls();
    }
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
    setSearchHighlightVerseId(null); // 清除搜索高亮
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

      const selectedVerseObjects = verses.filter(v => selectedVersesForAction.has(v.VerseSN))
        .sort((a, b) => a.VerseSN - b.VerseSN);
      
      const bookLabel = getBookShortName(currentBook?.FullName || '');
      
      // Format: 【BookAbbr Chapter:Verse】Text per line (matching web version)
      const formatted = selectedVerseObjects
        .map(v => {
          const parsed = parseVerseLection(v.Lection.trim());
          if (parsed.hasBilingual) {
            return `【${bookLabel} ${currentChapter}:${v.VerseSN}】\n${parsed.chinese}\n${parsed.english}`;
          }
          return `【${bookLabel} ${currentChapter}:${v.VerseSN}】${parsed.chinese}`;
        })
        .join('\n\n');

      await Clipboard.setStringAsync(formatted);
      Alert.alert('已复制', `已复制 ${sortedSNs.length} 节经文`);
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
    // Let's set all to true.
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
    setRangeAnchorId(null);
  };

  const onVersePress = (verse: BibleVerse) => {
    if (isSelectionMode) {
      if (copyModeType === 'range') {
        // Range mode: select all verses between anchor and current
        if (!rangeAnchorId) {
          setRangeAnchorId(verse.VerseSN);
          setSelectedVersesForAction(new Set([verse.VerseSN]));
        } else {
          const start = Math.min(rangeAnchorId, verse.VerseSN);
          const end = Math.max(rangeAnchorId, verse.VerseSN);
          const range = new Set<number>();
          for (let i = start; i <= end; i++) {
            range.add(i);
          }
          setSelectedVersesForAction(range);
        }
      } else {
        // Free mode: toggle individual verse
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
      }
    } else {
      setSelectedVerse(verse.VerseSN);
      toggleControls(); // Re-enabled toggle on verse tap
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
    const isSearchHighlighted = searchHighlightVerseId === item.ID;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        className={`flex-row mb-3 rounded-lg items-start pr-2 ${
          isSearchHighlighted 
            ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 shadow-lg' 
            : isHighlighted 
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/60' 
            : ''
        }`.trim()}
        onPress={() => {
          if (isSearchHighlighted) {
            setSearchHighlightVerseId(null);
          }
          onVersePress(item);
        }}
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
        <View className="flex-1">
          {(() => {
            const parsed = parseVerseLection(item.Lection);
            return (
              <>
                <Text
                  className={`font-serif ${
                    isSearchHighlighted 
                      ? 'text-gray-900 dark:text-gray-100' 
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                  style={{
                    fontSize: baseFontSize,
                    lineHeight: verseLineHeight,
                    paddingVertical: 4,
                    paddingRight: 6,
                    paddingLeft: 4,
                    fontWeight: isSearchHighlighted ? '600' : 'normal',
                    textDecorationLine: isSelected ? 'underline' : 'none',
                    textDecorationStyle: 'dashed',
                    textDecorationColor: isDark ? '#60a5fa' : '#93c5fd',
                  }}
                >
                  {parsed.chinese}
                </Text>
                {parsed.hasBilingual && (
                  <Text
                    className="font-serif text-gray-600 dark:text-gray-400"
                    style={{
                      fontSize: baseFontSize - 2,
                      lineHeight: verseLineHeight - 2,
                      paddingVertical: 2,
                      paddingRight: 6,
                      paddingLeft: 4,
                      fontStyle: 'italic',
                    }}
                  >
                    {parsed.english}
                  </Text>
                )}
              </>
            );
          })()}
        </View>
      </TouchableOpacity>
    );
  };

  const oldTestamentBooks = books.filter(b => b.NewOrOld === 0);
  const newTestamentBooks = books.filter(b => b.NewOrOld === 1);

  // 保存搜索历史
  const saveSearchHistory = async (query: string) => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;
      
      // 去重并添加到历史记录开头
      const updatedHistory = [
        trimmedQuery,
        ...searchHistory.filter(item => item !== trimmedQuery)
      ].slice(0, MAX_SEARCH_HISTORY);
      
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('保存搜索历史失败', error);
    }
  };

  // 删除单个搜索历史
  const removeSearchHistoryItem = async (query: string) => {
    try {
      const updatedHistory = searchHistory.filter(item => item !== query);
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('删除搜索历史失败', error);
    }
  };

  // 清空所有搜索历史
  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('清空搜索历史失败', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
       setHasSearched(false);
       return;
    }
    setIsSearching(true);
    setHasSearched(true);
    Keyboard.dismiss();
    try {
        const results = await searchVerses(searchQuery);
        setSearchResults(results);
        // 保存搜索历史
        await saveSearchHistory(searchQuery);
    } catch (e) {
        console.error(e);
        Alert.alert('搜索失败', '请稍后再试');
    } finally {
        setIsSearching(false);
    }
  };

  const renderSearchResult = ({ item }: { item: BibleVerse }) => {
    const book = books.find(b => b.SN === item.VolumeSN);
    return (
        <TouchableOpacity 
            className="py-3 border-b border-gray-100 dark:border-gray-800"
            onPress={() => {
                if (book) {
                    setCurrentBook(book);
                    setCurrentChapter(item.ChapterSN);
                    setPendingScrollVerse(item.VerseSN);
                    setSearchHighlightVerseId(item.ID);
                    setShowSearchModal(false);
                }
            }}
        >
            <View className="flex-row justify-between mb-1">
                <Text className="text-blue-600 font-bold dark:text-blue-400 text-base">
                    {book?.FullName} {item.ChapterSN}:{item.VerseSN}
                </Text>
            </View>
            {(() => {
              const parsed = parseVerseLection(item.Lection);
              return (
                <>
                  <Text className="text-base text-gray-800 dark:text-gray-200 leading-6" numberOfLines={2}>
                    {parsed.chinese}
                  </Text>
                  {parsed.hasBilingual && (
                    <Text className="text-sm text-gray-600 dark:text-gray-400 leading-5 italic" numberOfLines={2}>
                      {parsed.english}
                    </Text>
                  )}
                </>
              );
            })()}
        </TouchableOpacity>
    );
  };

  useEffect(() => {
    if (verses.length > 0 && pendingScrollVerse !== null) {
      const index = verses.findIndex(v => v.VerseSN === pendingScrollVerse);
      if (index !== -1) {
          setSelectedVerse(pendingScrollVerse);
          setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
          }, 500);
      }
      setPendingScrollVerse(null);
    }
  }, [verses, pendingScrollVerse]);

  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onEnd(() => {
      handleNextChapter();
    });

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .onEnd(() => {
      handlePrevChapter();
    });

  const gestures = Gesture.Simultaneous(flingLeft, flingRight);

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
          <GestureDetector gesture={gestures}>
            <View 
                className="flex-1"
                onStartShouldSetResponder={() => true}
                onResponderGrant={handleTouchStart}
                onResponderRelease={handleTouchEnd}
            >
                <FlatList
                    ref={flatListRef}
                    data={verses}
                    renderItem={renderVerse}
                    keyExtractor={item => item.ID.toString()}
                    extraData={{ selectedVerse, highlightedVerses, searchHighlightVerseId, selectedVersesForAction }}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                    removeClippedSubviews={Platform.OS === 'android'}
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
          </GestureDetector>
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
                onLongPress={() => !ncvUnlocked && setShowPasswordModal(true)}
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
                  {currentBook ? getBookShortName(currentBook.FullName) : '加载中...'}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={isDark ? '#93c5fd' : '#1d4ed8'} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-3 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700"
                onPress={() => setShowChapterModal(true)}
              >
                <Text className="text-base font-bold text-emerald-700 dark:text-emerald-200 mr-1">
                  {currentChapter} 章
                </Text>
                <IconSymbol name="chevron.down" size={12} color={isDark ? '#a7f3d0' : '#047857'} />
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-row items-center px-3 py-2 rounded-full border ${verses.length === 0 ? 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700' : 'bg-purple-100 border-purple-200 dark:bg-purple-900/40 dark:border-purple-700'}`}
                onPress={() => setShowVerseModal(true)}
                disabled={verses.length === 0}
              >
                <Text className={`text-base font-bold mr-1 ${verses.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-purple-700 dark:text-purple-200'}`}>
                  {selectedVerse ?? 1} 节
                </Text>
                <IconSymbol name="chevron.down" size={12} color={verses.length === 0 ? (isDark ? '#6b7280' : '#9ca3af') : (isDark ? '#c4b5fd' : '#6d28d9')} />
              </TouchableOpacity>
            </View>

            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <TouchableOpacity
                className={`px-3 py-2 rounded-full ${isSelectionMode ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}
                onPress={() => {
                  if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedVersesForAction(new Set());
                    setRangeAnchorId(null);
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
              >
                <IconSymbol name="doc.on.doc" size={20} color={isSelectionMode ? (isDark ? '#86efac' : '#16a34a') : (isDark ? '#9ca3af' : '#6b7280')} />
              </TouchableOpacity>

              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30"
                onPress={() => setSettingsVisible(true)}
              >
                <IconSymbol name="textformat.size" size={20} color={isDark ? '#e2e8f0' : '#475569'} />
              </TouchableOpacity>

              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800"
                onPress={() => setShowHistoryModal(true)}
              >
                <IconSymbol name="clock.fill" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>

              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800"
                onPress={() => setShowSearchModal(true)}
              >
                <IconSymbol name="magnifyingglass" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
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
                        setSearchHighlightVerseId(null);
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
                      className={`w-[18%] mb-3 p-2 rounded-xl items-center border ${currentBook?.SN === book.SN ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}
                      onPress={() => {
                        setSearchHighlightVerseId(null);
                        setCurrentBook(book);
                        setCurrentChapter(1); // 重置到第1章
                        setSelectedVerse(null); // 重置节选择
                        setShowBookModal(false);
                        // 自动跳转到章选择
                        setTimeout(() => setShowChapterModal(true), 150);
                        setBookTab(book.NewOrOld === 0 ? 'old' : 'new');
                      }}
                    >
                      <Text className={`text-2xl font-bold mb-1 ${currentBook?.SN === book.SN ? 'text-white dark:text-gray-900' : 'text-blue-600 dark:text-blue-400'}`}>
                        {getBookShortName(book.FullName)}
                      </Text>
                      <Text className={`text-[10px] text-center leading-3 ${currentBook?.SN === book.SN ? 'text-white/90 dark:text-gray-900/90' : 'text-gray-600 dark:text-gray-300'}`}>
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
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => { setShowChapterModal(false); setShowBookModal(true); }} className="mr-4">
                        <Text className="text-blue-600 font-bold">返回</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowChapterModal(false)}>
                        <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
              </View>
              <ScrollView className="max-h-72 px-4 pb-4">
                <View className="flex-row flex-wrap gap-3 justify-center">
                  {Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                    <TouchableOpacity
                      key={num}
                      className={`w-14 h-14 rounded-2xl items-center justify-center border ${currentChapter === num ? 'bg-blue-600 border-blue-700 dark:bg-blue-500 dark:border-blue-300' : 'bg-white border-gray-200 dark:border-gray-800 dark:border-gray-600'}`}
                      onPress={() => {
                        setSearchHighlightVerseId(null);
                        setCurrentChapter(num);
                        setSelectedVerse(null); // 重置节选择
                        setShowChapterModal(false);
                        // 自动跳转到节选择，等待经文加载完成
                        setTimeout(() => {
                          setShowVerseModal(true);
                        }, 300);
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
                        setShowControls(false);
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
          height: 50 + safeBottom,
          opacity: fadeAnim,
          transform: [{ 
            translateY: slideAnim.interpolate({
              inputRange: [-100, 0],
              outputRange: [50 + safeBottom, 0] 
            }) 
          }],
        }}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <View className="flex-row justify-around items-center flex-1">
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

          <TouchableOpacity 
            className="flex-1 items-center justify-center"
            onPress={() => router.push('/hymns')}
          >
            <IconSymbol size={28} name="music.note" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <Text style={{ color: Colors[colorScheme ?? 'light'].tabIconDefault, fontSize: 10, marginTop: 4 }}>诗歌</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Selection Action Bar */}
      {isSelectionMode && (() => {
        // Check if all selected verses are highlighted
        const allHighlighted = selectedVersesForAction.size > 0 && Array.from(selectedVersesForAction).every(sn => {
          const verse = verses.find(v => v.VerseSN === sn);
          return verse ? !!highlightedVerses[getVerseKey(verse)] : false;
        });

        return (
          <View 
            className="absolute left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{ bottom: 80 + safeBottom }}
          >
            {/* Status hint */}
            <View className="px-4 pt-3 pb-2">
              <Text className="text-xs text-center text-gray-500 dark:text-gray-400">
                {copyModeType === 'range' 
                  ? (rangeAnchorId === null ? '点击起始节' : `已选 ${selectedVersesForAction.size} 节`)
                  : `已选 ${selectedVersesForAction.size} 节`
                }
              </Text>
            </View>
            
            {/* Controls */}
            <View className="px-3 py-3 space-y-4">
              {/* Mode toggle buttons */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  className={`px-2 py-1.5 rounded-lg border ${copyModeType === 'range' ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-500' : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600'}`}
                  onPress={() => {
                    setCopyModeType('range');
                    setRangeAnchorId(null);
                    setSelectedVersesForAction(new Set());
                  }}
                >
                  <Text className={`text-xs font-semibold ${copyModeType === 'range' ? 'text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300'}`}>
                    连续
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`px-2 py-1.5 rounded-lg border ${copyModeType === 'free' ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-500' : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600'}`}
                  onPress={() => {
                    setCopyModeType('free');
                    setRangeAnchorId(null);
                    setSelectedVersesForAction(new Set());
                  }}
                >
                  <Text className={`text-xs font-semibold ${copyModeType === 'free' ? 'text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300'}`}>
                    随意
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action buttons */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                  className="flex-1 flex-row items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-700 py-2 rounded-lg"
                  onPress={exitSelectionMode}
                >
                  <IconSymbol name="xmark" size={16} color={isDark ? '#d1d5db' : '#6b7280'} />
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">取消</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${selectedVersesForAction.size > 0 ? (allHighlighted ? 'bg-gray-500 dark:bg-gray-600' : 'bg-amber-500 dark:bg-amber-600') : 'bg-gray-300 dark:bg-gray-600'}`}
                  onPress={handleHighlightSelected}
                  disabled={selectedVersesForAction.size === 0}
                >
                  <IconSymbol name={allHighlighted ? "star" : "star.fill"} size={16} color="#fff" />
                  <Text className="text-sm font-semibold text-white">{allHighlighted ? '取消高亮' : '高亮'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${selectedVersesForAction.size > 0 ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  onPress={handleCopySelected}
                  disabled={selectedVersesForAction.size === 0}
                >
                  <IconSymbol name="doc.on.doc" size={16} color="#fff" />
                  <Text className="text-sm font-semibold text-white">复制</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Password Modal for NCV Unlock */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPasswordInput('');
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-6 w-80 shadow-xl">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              解锁新译本
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              请输入口令以启用新译本（内测版）
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4"
              placeholder="输入口令"
              placeholderTextColor="#9ca3af"
              secureTextEntry={true}
              keyboardType="number-pad"
              value={passwordInput}
              onChangeText={setPasswordInput}
              onSubmitEditing={handlePasswordSubmit}
              autoFocus={true}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg py-3"
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
              >
                <Text className="text-center text-base font-semibold text-gray-700 dark:text-gray-300">
                  取消
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-600 dark:bg-blue-500 rounded-lg py-3"
                onPress={handlePasswordSubmit}
              >
                <Text className="text-center text-base font-semibold text-white">
                  确认
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reading Settings Modal */}
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
                      <Text className="text-slate-500 dark:text-slate-400">{(fontScale * 100).toFixed(0)}%</Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                      <TouchableOpacity 
                          onPress={() => setFontScale(s => {
                            const newScale = Math.max(0.8, Math.round((s - 0.1) * 10) / 10);
                            AsyncStorage.setItem('bible_font_size_scale', newScale.toString()).catch(console.error);
                            return newScale;
                          })}
                          className="p-3 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                      >
                          <Text className="text-slate-900 dark:text-white text-lg font-bold">A-</Text>
                      </TouchableOpacity>
                      
                      <View className="flex-1 items-center">
                           <Text className="text-slate-900 dark:text-white font-serif" style={{ fontSize: 18 * fontScale }}>预览 Text</Text>
                      </View>

                      <TouchableOpacity 
                          onPress={() => setFontScale(s => {
                            const newScale = Math.min(2.0, Math.round((s + 0.1) * 10) / 10);
                            AsyncStorage.setItem('bible_font_size_scale', newScale.toString()).catch(console.error);
                            return newScale;
                          })}
                          className="p-3 w-12 items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                      >
                          <Text className="text-slate-900 dark:text-white text-lg font-bold">A+</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top', 'bottom']}>
          <View className="flex-1 px-4 pt-4">
             <View className="flex-row items-center gap-2 mb-4">
                <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <IconSymbol name="magnifyingglass" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <TextInput
                        className="flex-1 ml-2 text-base text-gray-900 dark:text-gray-100 py-1"
                        placeholder="搜索经文..."
                        placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                        value={searchQuery}
                        onChangeText={(text) => {
                          setSearchQuery(text);
                          setHasSearched(false);
                        }}
                        onSubmitEditing={performSearch}
                        returnKeyType="search"
                        autoFocus
                        clearButtonMode="while-editing"
                    />
                     {(searchQuery.length > 0 || searchResults.length > 0) && Platform.OS !== 'ios' && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            setHasSearched(false);
                        }}>
                             <IconSymbol name="xmark.circle.fill" size={16} color={isDark ? '#6b7280' :'#9ca3af'} />
                        </TouchableOpacity>
                     )}
                </View>
                <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                    <Text className="text-blue-600 font-bold text-lg">取消</Text>
                </TouchableOpacity>
             </View>
             
             {isSearching ? (
                 <ActivityIndicator size="large" color="#2563eb" className="mt-10" />
             ) : searchResults.length > 0 ? (
                <FlatList
                    data={searchResults}
                    keyExtractor={item => `${item.VolumeSN}-${item.ChapterSN}-${item.VerseSN}`}
                    renderItem={renderSearchResult}
                    keyboardShouldPersistTaps="handled" 
                />
             ) : hasSearched && searchQuery.length > 0 ? (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-center text-gray-500 text-base">未找到相关经文</Text>
                </View>
             ) : (
                <View className="flex-1">
                    {/* 搜索历史 */}
                    {searchHistory.length > 0 && (
                        <View className="mb-4">
                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">
                                    搜索历史
                                </Text>
                                <TouchableOpacity 
                                    onPress={() => {
                                        Alert.alert(
                                            '清空搜索历史',
                                            '确定要清空所有搜索历史吗？',
                                            [
                                                { text: '取消', style: 'cancel' },
                                                { 
                                                    text: '清空', 
                                                    style: 'destructive',
                                                    onPress: clearSearchHistory 
                                                }
                                            ]
                                        );
                                    }}
                                    className="px-2 py-1"
                                >
                                    <Text className="text-sm text-red-600 dark:text-red-400">清空</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View className="flex-row flex-wrap gap-2">
                                {searchHistory.map((historyItem, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={async () => {
                                            setSearchQuery(historyItem);
                                            setIsSearching(true);
                                            setHasSearched(true);
                                            Keyboard.dismiss();
                                            try {
                                                const results = await searchVerses(historyItem);
                                                setSearchResults(results);
                                            } catch (e) {
                                                console.error(e);
                                                Alert.alert('搜索失败', '请稍后再试');
                                            } finally {
                                                setIsSearching(false);
                                            }
                                        }}
                                        onLongPress={() => {
                                            Alert.alert(
                                                '删除搜索记录',
                                                `确定要删除 "${historyItem}" 吗？`,
                                                [
                                                    { text: '取消', style: 'cancel' },
                                                    { 
                                                        text: '删除', 
                                                        style: 'destructive',
                                                        onPress: () => removeSearchHistoryItem(historyItem)
                                                    }
                                                ]
                                            );
                                        }}
                                        className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2"
                                    >
                                        <IconSymbol name="clock" size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                                        <Text className="ml-1.5 text-sm text-gray-700 dark:text-gray-300">
                                            {historyItem}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            
                            <Text className="text-xs text-gray-400 dark:text-gray-600 mt-3 text-center">
                                点击搜索，长按删除
                            </Text>
                        </View>
                    )}
                    
                    {/* 搜索提示 */}
                    <View className="flex-1 items-center justify-center">
                        <IconSymbol name="magnifyingglass" size={48} color={isDark ? '#374151' : '#e5e7eb'} />
                        <Text className="text-gray-400 dark:text-gray-600 mt-4 text-center px-8">
                            {searchHistory.length > 0 ? '输入关键词搜索经文' : '输入关键词搜索经文\n搜索记录会自动保存'}
                        </Text>
                    </View>
                </View>
             )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
