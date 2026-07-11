import React, { useState, useEffect, useRef, useContext } from 'react';
import { getBooks, getVerses, BibleBook, BibleVerse, searchVerses, BibleVersion, parseVerseLection } from '../services/BibleService';
import { Search, ChevronLeft, ChevronRight, Menu, X, Copy, Square, CheckSquare, Check } from 'lucide-react';
import { LayoutContext } from '../App';
import { AuthContext } from '../App';

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
  'Revelation': '启',
};

// 获取书卷简写
const getBookShortName = (fullName: string): string => {
  return BOOK_SHORT_NAME_MAP[fullName] || fullName.charAt(0);
};

export const Bible: React.FC = () => {
  const { isMenuVisible, setMenuVisible } = useContext(LayoutContext);
  const { isAdmin } = useContext(AuthContext);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [currentBook, setCurrentBook] = useState<BibleBook | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Keep for desktop
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [version, setVersion] = useState<BibleVersion>('cuv');
  // Default font size scale increased to 1.2
  const [fontSizeScale, setFontSizeScale] = useState(1.2);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [highlightedVerseId, setHighlightedVerseId] = useState<number | null>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const oldTestamentRef = useRef<HTMLDivElement>(null);
  const newTestamentRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  // Copy mode state
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [copyModeType, setCopyModeType] = useState<'range' | 'free'>('free');
  const [selectedVerseIds, setSelectedVerseIds] = useState<Set<number>>(new Set());
  const [rangeAnchorId, setRangeAnchorId] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Font Helpers
  const decreaseFont = () => setFontSizeScale(s => Math.max(0.8, Math.round((s - 0.1) * 10) / 10));
  const increaseFont = () => setFontSizeScale(s => Math.min(2.0, Math.round((s + 0.1) * 10) / 10));

  const exitCopyMode = () => {
    setIsCopyMode(false);
    setSelectedVerseIds(new Set());
    setRangeAnchorId(null);
    setCopySuccess(false);
  };

  const handleCopyVerseClick = (verse: BibleVerse) => {
    if (copyModeType === 'free') {
      setSelectedVerseIds(prev => {
        const next = new Set(prev);
        if (next.has(verse.ID)) next.delete(verse.ID);
        else next.add(verse.ID);
        return next;
      });
    } else {
      if (rangeAnchorId === null) {
        setRangeAnchorId(verse.ID);
        setSelectedVerseIds(new Set([verse.ID]));
      } else {
        const ai = verses.findIndex(v => v.ID === rangeAnchorId);
        const ci = verses.findIndex(v => v.ID === verse.ID);
        const [s, e] = ai <= ci ? [ai, ci] : [ci, ai];
        setSelectedVerseIds(new Set(verses.slice(s, e + 1).map(v => v.ID)));
        setRangeAnchorId(null);
      }
    }
  };

  const handleCopySelected = async () => {
    if (selectedVerseIds.size === 0) return;
    const shortName = currentBook ? getBookShortName(currentBook.FullName) : '';
    const text = verses
      .filter(v => selectedVerseIds.has(v.ID))
      .sort((a, b) => a.VerseSN - b.VerseSN)
      .map(v => {
        const parsed = parseVerseLection(v.Lection);
        const verseHeader = `【${shortName} ${currentChapter}:${v.VerseSN}】`;
        if (parsed.hasBilingual) {
          return `${verseHeader}\n${parsed.chinese}\n${parsed.english}`;
        }
        return `${verseHeader}${parsed.chinese}`;
      })
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
      exitCopyMode();
    }, 1500);
  };

  // Mobile Modal States
  const [showBookModal, setShowBookModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [bookTab, setBookTab] = useState<'old' | 'new'>('old');
  const [showCategory, setShowCategory] = useState(true);
  const [modalView, setModalView] = useState<'books' | 'chapters' | 'verses'>('books');
  const versesContainerRef = useRef<HTMLDivElement>(null);

  // 圣经书卷分类
  const BOOK_CATEGORIES = [
    { name: '摩西五经', books: [1, 2, 3, 4, 5] },
    { name: '旧约历史书', books: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
    { name: '诗歌智慧书', books: [18, 19, 20, 21, 22] },
    { name: '大先知书', books: [23, 24, 25, 26, 27] },
    { name: '小先知书', books: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39] },
    { name: '福音书', books: [40, 41, 42, 43] },
    { name: '新约历史书', books: [44] },
    { name: '保罗书信', books: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57] },
    { name: '普通书信', books: [58, 59, 60, 61, 62, 63, 64, 65] },
    { name: '启示录', books: [66] },
  ];
  
  // Desktop Modal States
  const [showDesktopChapterModal, setShowDesktopChapterModal] = useState(false);
  const [showDesktopVerseModal, setShowDesktopVerseModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getBooks(version);
        setBooks(data);
        if (!currentBook && data.length > 0) {
          setCurrentBook(data[0]);
        } else if (currentBook) {
            const found = data.find(b => b.SN === currentBook.SN);
            if (found) setCurrentBook(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [version]);

  useEffect(() => {
    if (currentBook) {
      setLoading(true);
      getVerses(currentBook.SN, currentChapter, version)
        .then(verses => {
          setVerses(verses);
          // 如果不是高亮跳转导致的章节切换，清除高亮
          // 高亮会在点击搜索结果时设置，并在延迟后滚动
        })
        .catch(console.error)
        .finally(() => {
          setLoading(false);
          // 只有在没有高亮时才滚动到顶部
          if (!highlightedVerseId && versesContainerRef.current) {
            versesContainerRef.current.scrollTop = 0;
          }
        });
    }
  }, [currentBook, currentChapter, version]);

  // 切换书卷/章节时退出复制模式，防止跨章节选择
  useEffect(() => {
    setIsCopyMode(false);
    setSelectedVerseIds(new Set());
    setRangeAnchorId(null);
    setCopySuccess(false);
  }, [currentBook?.SN, currentChapter]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchVerses(searchQuery, version);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookSelect = (book: BibleBook) => {
    setCurrentBook(book);
    setCurrentChapter(1);
    if (window.innerWidth < 768) {
        setSidebarOpen(false);
        setModalView('chapters'); // Switch to chapter selection on mobile
    } else {
        // 桌面端自动打开章选择模态框
        setTimeout(() => setShowDesktopChapterModal(true), 200);
    }
  };

  const handleChapterSelect = (chapter: number) => {
      setHighlightedVerseId(null); // 清除高亮
      setCurrentChapter(chapter);
      // 立即切换到节选择视图，显示加载状态
      setModalView('verses');
  };  
  const handleDesktopChapterSelect = (chapter: number) => {
      setHighlightedVerseId(null);
      setCurrentChapter(chapter);
      setShowDesktopChapterModal(false);
      // 桌面端立即打开节选择
      setTimeout(() => setShowDesktopVerseModal(true), 150);
  };
  
  const handleDesktopVerseSelect = (verseNum: number) => {
      setShowDesktopVerseModal(false);
      
      setTimeout(() => {
          const verse = verses.find(v => v.VerseSN === verseNum);
          if (verse) {
              const verseElement = verseRefs.current.get(verse.ID);
              if (verseElement && versesContainerRef.current) {
                  const prevVerse = verses.find(v => v.VerseSN === verseNum - 1);
                  const prevElement = prevVerse ? verseRefs.current.get(prevVerse.ID) : null;
                  
                  const targetElement = prevElement || verseElement;
                  const containerTop = versesContainerRef.current.getBoundingClientRect().top;
                  const elementTop = targetElement.getBoundingClientRect().top;
                  const offset = elementTop - containerTop + versesContainerRef.current.scrollTop;
                    const jumpOffset = isMenuVisible ? 140 : 24;
                  
                  versesContainerRef.current.scrollTo({
                      top: Math.max(0, offset - jumpOffset),
                      behavior: 'smooth'
                  });
                  
                  setHighlightedVerseId(verse.ID);
                  setTimeout(() => setHighlightedVerseId(null), 3000);
              }
          }
      }, 500);
  };  
  const handleVerseSelect = (verseNum: number) => {
      setShowBookModal(false);
      setModalView('books'); // Reset for next time
      
      // 等待verses更新和DOM渲染后再滚动
      setTimeout(() => {
          const verse = verses.find(v => v.VerseSN === verseNum);
          if (verse) {
              const verseElement = verseRefs.current.get(verse.ID);
              if (verseElement && versesContainerRef.current) {
                  // 先获取上一节的元素（如果存在）
                  const prevVerse = verses.find(v => v.VerseSN === verseNum - 1);
                  const prevElement = prevVerse ? verseRefs.current.get(prevVerse.ID) : null;
                  
                  // 计算滚动位置：如果有上一节，滚动到上一节的位置；否则滚动到当前节
                  const targetElement = prevElement || verseElement;
                  const containerTop = versesContainerRef.current.getBoundingClientRect().top;
                  const elementTop = targetElement.getBoundingClientRect().top;
                  const offset = elementTop - containerTop + versesContainerRef.current.scrollTop;
                    const jumpOffset = isMenuVisible ? 100 : 20;
                  
                  versesContainerRef.current.scrollTo({
                      top: Math.max(0, offset - jumpOffset),
                      behavior: 'smooth'
                  });
                  
                  // 高亮选中的节
                  setHighlightedVerseId(verse.ID);
                  // 3秒后清除高亮
                  setTimeout(() => setHighlightedVerseId(null), 3000);
              }
          }
      }, 500);
  };

  const handlePrevChapter = () => {
    setHighlightedVerseId(null); // 清除高亮
    if (currentChapter > 1) {
      setCurrentChapter(c => c - 1);
    } else if (currentBook && currentBook.SN > 1) {
      const prevBook = books.find(b => b.SN === currentBook.SN - 1);
      if (prevBook) {
        setCurrentBook(prevBook);
        setCurrentChapter(prevBook.ChapterNumber);
      }
    }
  };

  const handleNextChapter = () => {
    setHighlightedVerseId(null); // 清除高亮
    if (currentBook && currentChapter < currentBook.ChapterNumber) {
      setCurrentChapter(c => c + 1);
    } else if (currentBook && currentBook.SN < 66) {
      const nextBook = books.find(b => b.SN === currentBook.SN + 1);
      if (nextBook) {
        setCurrentBook(nextBook);
        setCurrentChapter(1);
      }
    }
  };

  const oldTestament = books.filter(b => b.NewOrOld === 0);
  const newTestament = books.filter(b => b.NewOrOld === 1);

  // Swipe Gesture Handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
      touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
      if (!touchStartX.current || !touchEndX.current) return;
      
      const distanceX = touchStartX.current - touchEndX.current;
      const distanceY = touchStartY.current! - touchEndY.current!;
      const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

      // Threshold of 50px for swipe
      if (isHorizontalSwipe && Math.abs(distanceX) > 50) {
          if (distanceX > 0) {
              // Swiped Left -> Next Chapter
              handleNextChapter();
          } else {
              // Swiped Right -> Prev Chapter
              handlePrevChapter();
          }
      }
      
      // Reset
      touchStartX.current = null;
      touchEndX.current = null; 
      touchStartY.current = null;
      touchEndY.current = null;
  };

  return (
    <div className="flex h-full bg-white dark:bg-[#1e1a14] overflow-hidden relative">
      {/* Desktop Sidebar - Book List (Hidden on Mobile) */}
      <div className={`hidden md:flex ${sidebarOpen && isMenuVisible ? 'w-80' : 'w-0'} pt-32 transition-all duration-500 ease-in-out bg-warm-50 dark:bg-[#252018] border-r border-border dark:border-[#4a3f30] flex-col relative z-20 h-full overflow-hidden`}>
        <div className="p-4 border-b border-border dark:border-[#4a3f30]">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="搜索经文..."
              className="w-full pl-9 pr-9 py-2 rounded-lg bg-white dark:bg-[#252018] border border-border dark:border-[#4a3f30] focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            {(searchQuery || searchResults.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-2.5 hover:bg-warm-200 dark:hover:bg-[#4a3f30] rounded-full p-0.5"
              >
                <X className="w-4 h-4 text-text-muted hover:text-text-secondary dark:hover:text-[#f5ece0]" />
              </button>
            )}
          </form>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setBookTab('old');
                setShowCategory(false);
                setTimeout(() => {
                  oldTestamentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${bookTab === 'old' && !showCategory ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-text-muted hover:bg-warm-100 dark:hover:bg-[#352c20]'}`}
            >
              旧约
            </button>
            <button
              onClick={() => {
                setBookTab('new');
                setShowCategory(false);
                setTimeout(() => {
                  newTestamentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${bookTab === 'new' && !showCategory ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-text-muted hover:bg-warm-100 dark:hover:bg-[#352c20]'}`}
            >
              新约
            </button>
            <button
              onClick={() => setShowCategory(!showCategory)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${showCategory ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-text-muted hover:bg-warm-100 dark:hover:bg-[#352c20]'}`}
            >
              {showCategory ? '按类别' : '按顺序'}
            </button>
          </div>
        </div>
        
        <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto p-2">
          {searchResults.length > 0 ? (
             <div className="space-y-1">
               <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase">搜索结果 ({searchResults.length})</div>
               {searchResults.map(verse => {
                  const book = books.find(b => b.SN === verse.VolumeSN);
                  return (
                      <button
                          key={verse.ID}
                          onClick={() => {
                              if (book) {
                                  setCurrentBook(book);
                                  setCurrentChapter(verse.ChapterSN);
                                  setHighlightedVerseId(verse.ID);
                                  // 延迟滚动，等待章节加载完成
                                  setTimeout(() => {
                                      const verseElement = verseRefs.current.get(verse.ID);
                                      if (verseElement) {
                                          verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                  }, 300);
                              }
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-warm-200 dark:hover:bg-[#352c20] text-sm"
                      >
                          <span className="font-bold text-primary-600">{book?.ShortName} {verse.ChapterSN}:{verse.VerseSN}</span>
                          <p className="text-text-secondary dark:text-[#d4c4b0] truncate">{parseVerseLection(verse.Lection).chinese}</p>
                      </button>
                  )
               })}
             </div>
          ) : showCategory ? (
              <div className="space-y-3 px-2 pb-4">
                  {BOOK_CATEGORIES.map(cat => {
                      const catBooks = books.filter(b => cat.books.includes(b.SN));
                      if (catBooks.length === 0) return null;
                      return (
                          <div key={cat.name}>
                              <div className="text-[10px] font-semibold text-text-muted uppercase mb-1.5 px-1">{cat.name}</div>
                              <div className="grid grid-cols-4 gap-1.5">
                                  {catBooks.map(book => (
                                      <button
                                          key={book.SN}
                                          onClick={() => handleBookSelect(book)}
                                          className={`p-1.5 rounded-lg flex flex-col items-center justify-center border min-h-[3rem] ${currentBook?.SN === book.SN ? 'bg-primary-600 text-white border-primary-700 dark:bg-primary-500 dark:border-primary-400' : 'bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30] hover:bg-primary-50 dark:hover:bg-primary-900/30'}`}
                                      >
                                          <span className={`text-sm font-bold whitespace-nowrap ${currentBook?.SN === book.SN ? 'text-white dark:text-[#f5ece0]' : 'text-primary-600 dark:text-primary-400'}`}>{getBookShortName(book.FullName)}</span>
                                          <span className={`text-[8px] text-center leading-2 mt-0.5 ${currentBook?.SN === book.SN ? 'text-white/80 dark:text-[#f5ece0]/80' : 'text-text-muted dark:text-[#a89880]'}`}>{book.FullName}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          ) : (
              <>
                  <div ref={oldTestamentRef} className="px-3 py-2 text-xs font-semibold text-text-muted uppercase mt-2">旧约</div>
                  <div className="grid grid-cols-4 gap-1.5 px-2">
                      {oldTestament.map(book => (
                      <button
                          key={book.SN}
                          onClick={() => handleBookSelect(book)}
                          className={`p-1.5 rounded-lg flex flex-col items-center justify-center border min-h-[3rem] ${currentBook?.SN === book.SN ? 'bg-primary-600 text-white border-primary-700 dark:bg-primary-500 dark:border-primary-400' : 'bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30] hover:bg-primary-50 dark:hover:bg-primary-900/30'}`}
                      >
                          <span className={`text-sm font-bold whitespace-nowrap ${currentBook?.SN === book.SN ? 'text-white dark:text-[#f5ece0]' : 'text-primary-600 dark:text-primary-400'}`}>{getBookShortName(book.FullName)}</span>
                          <span className={`text-[8px] text-center leading-2 mt-0.5 ${currentBook?.SN === book.SN ? 'text-white/80 dark:text-[#f5ece0]/80' : 'text-text-muted dark:text-[#a89880]'}`}>{book.FullName}</span>
                      </button>
                      ))}
                  </div>

                  <div ref={newTestamentRef} className="px-3 py-2 text-xs font-semibold text-text-muted uppercase mt-3">新约</div>
                  <div className="grid grid-cols-4 gap-1.5 px-2 pb-4">
                      {newTestament.map(book => (
                      <button
                          key={book.SN}
                          onClick={() => handleBookSelect(book)}
                          className={`p-1.5 rounded-lg flex flex-col items-center justify-center border min-h-[3rem] ${currentBook?.SN === book.SN ? 'bg-primary-600 text-white border-primary-700 dark:bg-primary-500 dark:border-primary-400' : 'bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30] hover:bg-primary-50 dark:hover:bg-primary-900/30'}`}
                      >
                          <span className={`text-sm font-bold whitespace-nowrap ${currentBook?.SN === book.SN ? 'text-white dark:text-[#f5ece0]' : 'text-primary-600 dark:text-primary-400'}`}>{getBookShortName(book.FullName)}</span>
                          <span className={`text-[8px] text-center leading-2 mt-0.5 ${currentBook?.SN === book.SN ? 'text-white/80 dark:text-[#f5ece0]/80' : 'text-text-muted dark:text-[#a89880]'}`}>{book.FullName}</span>
                      </button>
                      ))}
                  </div>
              </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Persistent Info Bar (Always visible, sits behind the main header) */}
        <div className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center bg-white dark:bg-[#1e1a14] border-b border-border-light dark:border-[#4a3f30] z-0 select-none">
           <span className="text-xs font-bold text-text-muted dark:text-[#a89880]">
             {version === 'cuv' ? '和合本' : version === 'ncv' ? '新译本' : 'ASV'} · {currentBook?.FullName} {currentChapter}章
           </span>
        </div>

        {/* Header */}
        <div className={`absolute top-0 md:top-16 left-0 right-0 h-14 md:h-16 border-b border-border dark:border-[#4a3f30] flex items-center justify-between px-4 bg-white dark:bg-[#1e1a14] z-10 flex-shrink-0 transition-all duration-500 ease-in-out ${!isMenuVisible ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
          <div className="flex items-center flex-1 min-w-0 mr-2">
              <button 
                  className="hidden md:block mr-4 p-2 -ml-2 rounded-md hover:bg-warm-100 dark:hover:bg-[#252018]"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                  <Menu className="w-5 h-5 text-text-secondary dark:text-[#d4c4b0]" />
              </button>
              
              {/* Mobile Book Selector Trigger */}
              <button 
                className="md:hidden flex items-center text-left min-w-0"
                onClick={() => {
                    setShowBookModal(true);
                    setModalView('books');
                }}
              >
                 <h1 className="text-lg font-bold text-text-primary dark:text-[#f5ece0] truncate">
                    {currentBook?.FullName} {currentChapter}
                 </h1>
                 <ChevronRight className="w-4 h-4 ml-1 flex-shrink-0 text-text-muted" />
              </button>

              {/* Desktop Title */}
              <h1 className="hidden md:block text-xl font-bold text-text-primary dark:text-[#f5ece0]">
                {currentBook?.FullName} 第 {currentChapter} 章
              </h1>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Mobile Search Button */}
            <button 
                onClick={() => setShowSearchModal(true)}
                className="md:hidden p-2 rounded-full hover:bg-warm-100 dark:hover:bg-[#252018] text-text-secondary dark:text-[#d4c4b0]"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Copy Verse Button */}
            <button
              onClick={() => isCopyMode ? exitCopyMode() : setIsCopyMode(true)}
              title={isCopyMode ? '退出复制模式' : '复制经文'}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-sm font-medium transition-all mr-1 border ${
                isCopyMode
                  ? 'bg-primary-600 text-white border-primary-700 hover:bg-primary-700 shadow-sm'
                  : 'bg-warm-100 dark:bg-[#252018] text-text-secondary dark:text-[#d4c4b0] border-border dark:border-[#4a3f30] hover:bg-warm-200 dark:hover:bg-[#352c20]'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span className="hidden lg:inline">{isCopyMode ? '退出复制' : '复制经文'}</span>
            </button>

            {/* Font Size Control - T icon toggle */}
            <div className="flex items-center gap-1 mr-1 md:mr-2">
                 <button
                    onClick={() => setShowFontSizePicker(prev => !prev)}
                    className={`p-1.5 md:p-2 rounded-full border transition-colors ${showFontSizePicker ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700' : 'border-transparent hover:bg-warm-100 dark:hover:bg-[#252018]'}`}
                    title="字体大小"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5 text-text-secondary dark:text-[#d4c4b0]">
                      <polyline points="4 7 4 4 20 4 20 7"></polyline>
                      <line x1="9" y1="20" x2="15" y2="20"></line>
                      <line x1="12" y1="4" x2="12" y2="20"></line>
                    </svg>
                 </button>
            </div>

            {/* Font Size Picker Panel */}
            {showFontSizePicker && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-[#1e1a14] border border-border dark:border-[#4a3f30] rounded-xl shadow-lg p-3 z-50">
                <div className="flex items-center gap-3">
                  <button onClick={decreaseFont} className="px-3 py-1.5 rounded-lg bg-warm-200 dark:bg-[#4a3f30] text-text-primary dark:text-[#f5ece0] font-semibold text-sm">A-</button>
                  <span className="text-text-primary dark:text-[#f5ece0] font-semibold text-sm min-w-[3rem] text-center">{(fontSizeScale * 100).toFixed(0)}%</span>
                  <button onClick={increaseFont} className="px-3 py-1.5 rounded-lg bg-warm-200 dark:bg-[#4a3f30] text-text-primary dark:text-[#f5ece0] font-semibold text-sm">A+</button>
                </div>
              </div>
            )}

            <select
                value={version}
                onChange={(e) => setVersion(e.target.value as BibleVersion)}
                className="bg-warm-100 dark:bg-[#252018] border-none rounded-md py-1 px-2 text-[10px] md:text-sm focus:ring-2 focus:ring-primary-500 dark:text-white mr-1 md:mr-2"
            >
                <option value="cuv">和合本</option>
                <option value="bilingual">中英对照</option>
                <option value="asv">ASV</option>
                {isAdmin && <option value="ncv">新译本</option>}
            </select>

            <button 
              onClick={handlePrevChapter}
              className="hidden md:block p-1.5 md:p-2 rounded-full hover:bg-warm-100 dark:hover:bg-[#252018] disabled:opacity-50"
              disabled={!currentBook || (currentBook.SN === 1 && currentChapter === 1)}
            >
              <ChevronLeft className="w-5 h-5 text-text-secondary dark:text-[#d4c4b0]" />
            </button>
            
            {/* Desktop Chapter & Verse Select Buttons */}
            <button
              onClick={() => setShowDesktopChapterModal(true)}
              className="hidden md:flex items-center gap-1 bg-warm-100 dark:bg-[#252018] hover:bg-warm-200 dark:hover:bg-[#352c20] rounded-md py-1 px-3 text-sm font-medium text-text-secondary dark:text-[#d4c4b0] transition-colors"
            >
              {currentChapter} 章
              <ChevronRight className="w-3 h-3" />
            </button>
            
            <button
              onClick={() => setShowDesktopVerseModal(true)}
              className="hidden md:flex items-center gap-1 bg-warm-100 dark:bg-[#252018] hover:bg-warm-200 dark:hover:bg-[#352c20] rounded-md py-1 px-3 text-sm font-medium text-text-secondary dark:text-[#d4c4b0] transition-colors"
            >
              节
              <ChevronRight className="w-3 h-3" />
            </button>

            <button 
              onClick={handleNextChapter}
              className="hidden md:block p-1.5 md:p-2 rounded-full hover:bg-warm-100 dark:hover:bg-[#252018] disabled:opacity-50"
              disabled={!currentBook || (currentBook.SN === 66 && currentChapter === 22)}
            >
              <ChevronRight className="w-5 h-5 text-text-secondary dark:text-[#d4c4b0]" />
            </button>
          </div>
        </div>

        {/* Verses Area */}
        <div 
          ref={versesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-36 bg-white dark:bg-[#1e1a14] cursor-pointer"
          onClick={(e) => {
            if (isCopyMode) return; // 复制模式下不触发菜单切换
            // 如果点击的是经文容器本身（不是经文内容），则清除高亮
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('max-w-3xl')) {
              if (highlightedVerseId) {
                setHighlightedVerseId(null);
              } else {
                setMenuVisible(!isMenuVisible);
              }
            } else {
              setMenuVisible(!isMenuVisible);
            }
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-1 pb-20">
              {verses.map(verse => {
                const isHighlighted = highlightedVerseId === verse.ID;
                const isSelected = isCopyMode && selectedVerseIds.has(verse.ID);
                const isAnchor = isCopyMode && copyModeType === 'range' && rangeAnchorId === verse.ID;
                return (
                  <div 
                    key={verse.ID} 
                    ref={(el) => {
                      if (el) {
                        verseRefs.current.set(verse.ID, el);
                      } else {
                        verseRefs.current.delete(verse.ID);
                      }
                    }}
                    onClick={(e) => {
                      if (isCopyMode) {
                        e.stopPropagation();
                        handleCopyVerseClick(verse);
                      } else if (isHighlighted) {
                        e.stopPropagation();
                        setHighlightedVerseId(null);
                      }
                    }}
                    className={`flex group p-1 px-2 rounded-lg transition-all duration-300 ${
                      isCopyMode
                        ? `cursor-pointer select-none ${
                            isSelected
                              ? isAnchor
                                ? 'bg-primary-100 dark:bg-primary-800/40 ring-1 ring-inset ring-primary-400'
                                : 'bg-primary-50 dark:bg-primary-900/30'
                              : 'hover:bg-warm-50 dark:hover:bg-[#252018]/50'
                          }`
                        : isHighlighted 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 shadow-lg cursor-pointer' 
                          : 'hover:bg-warm-50 dark:hover:bg-[#252018]/50'
                    }`}
                  >
                    {isCopyMode && (
                      <div className="w-5 flex-shrink-0 flex items-start pt-1.5 mr-1">
                        {isSelected
                          ? <CheckSquare className={`w-4 h-4 ${isAnchor ? 'text-primary-700 dark:text-primary-300' : 'text-primary-500 dark:text-primary-400'}`} />
                          : <Square className="w-4 h-4 text-text-muted dark:text-text-secondary" />
                        }
                      </div>
                    )}
                    <span className="text-xs text-text-muted w-6 md:w-8 pt-2 select-none flex-shrink-0">{verse.VerseSN}</span>
                    <div className={`leading-relaxed font-serif flex-1 transition-all duration-200 ${
                      (isCopyMode && isSelected) || isHighlighted
                        ? 'text-text-primary dark:text-[#f5ece0] font-medium' 
                        : 'text-text-primary dark:text-[#d4c4b0]'
                    }`}>
                      {(() => {
                        const parsed = parseVerseLection(verse.Lection);
                        return parsed.hasBilingual ? (
                          <>
                            <p style={{ fontSize: `${fontSizeScale}rem`, lineHeight: '1.6' }}>
                              {parsed.chinese}
                            </p>
                            <p style={{ 
                              fontSize: `${fontSizeScale}rem`, 
                              lineHeight: '1.6',
                              fontStyle: 'italic',
                              color: 'rgb(107, 114, 128)',
                              marginTop: '0.25rem'
                            }} className="dark:text-text-muted">
                              {parsed.english}
                            </p>
                          </>
                        ) : (
                          <p style={{ fontSize: `${fontSizeScale}rem`, lineHeight: '1.6' }}>
                            {parsed.chinese}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-border-light dark:border-[#4a3f30]">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrevChapter();
                    }}
                    disabled={!currentBook || (currentBook.SN === 1 && currentChapter === 1)}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                        (!currentBook || (currentBook.SN === 1 && currentChapter === 1))
                        ? 'border-border bg-warm-50 text-text-muted cursor-not-allowed dark:bg-[#252018] dark:border-[#352c20]'
                        : 'border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400'
                    }`}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一章
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNextChapter();
                    }}
                    disabled={!currentBook || (currentBook.SN === 66 && currentChapter === 22)}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                        (!currentBook || (currentBook.SN === 66 && currentChapter === 22))
                        ? 'border-border bg-warm-50 text-text-muted cursor-not-allowed dark:bg-[#252018] dark:border-[#352c20]'
                        : 'border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400'
                    }`}
                >
                    下一章
                    <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Copy Mode Action Bar - Desktop */}
        {isCopyMode && (
          <div className="hidden md:flex border-t border-border dark:border-[#4a3f30] px-6 py-3 items-center justify-between bg-white dark:bg-[#1e1a14] shadow-[0_-4px_16px_rgba(0,0,0,0.07)] flex-shrink-0 z-10">
            <div className="flex items-center gap-4">
              {/* 选择模式切换 */}
              <div className="flex items-center bg-warm-100 dark:bg-[#252018] rounded-lg p-0.5">
                <button
                  onClick={() => { setCopyModeType('range'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    copyModeType === 'range'
                      ? 'bg-white dark:bg-[#252018] text-text-primary dark:text-[#f5ece0] shadow-sm'
                      : 'text-text-muted dark:text-[#a89880] hover:text-text-secondary dark:hover:text-[#f5ece0]'
                  }`}
                >
                  连续选择
                </button>
                <button
                  onClick={() => { setCopyModeType('free'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    copyModeType === 'free'
                      ? 'bg-white dark:bg-[#252018] text-text-primary dark:text-[#f5ece0] shadow-sm'
                      : 'text-text-muted dark:text-[#a89880] hover:text-text-secondary dark:hover:text-[#f5ece0]'
                  }`}
                >
                  随意选择
                </button>
              </div>
              {/* 操作提示 */}
              <span className="text-sm text-text-muted dark:text-[#a89880]">
                {copyModeType === 'range'
                  ? (rangeAnchorId !== null
                      ? `从第 ${verses.find(v => v.ID === rangeAnchorId)?.VerseSN} 节起 → 点击结束节`
                      : '点击起始节')
                  : (selectedVerseIds.size > 0 ? `已选 ${selectedVerseIds.size} 节` : '点击经文勾选')
                }
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopySelected}
                disabled={selectedVerseIds.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedVerseIds.size === 0
                    ? 'bg-warm-100 dark:bg-[#252018] text-text-muted cursor-not-allowed'
                    : copySuccess
                      ? 'bg-green-500 text-white scale-95'
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-sm'
                }`}
              >
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? '已复制！' : `复制${selectedVerseIds.size > 0 ? `（${selectedVerseIds.size}节）` : ''}`}
              </button>
              <button
                onClick={exitCopyMode}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-warm-100 dark:bg-[#252018] text-text-secondary dark:text-[#d4c4b0] hover:bg-warm-200 dark:hover:bg-[#352c20] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Copy Mode Action Panel - Mobile */}
        {isCopyMode && (
          <div className="md:hidden fixed bottom-20 left-0 right-0 bg-white dark:bg-[#1e1a14] border-t border-border dark:border-[#4a3f30] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 animate-slide-up rounded-t-2xl">
            <div className="px-4 py-3 space-y-2">
              {/* Status Hint */}
              <div className="text-center text-xs text-text-muted dark:text-[#a89880]">
                {copyModeType === 'range'
                  ? (rangeAnchorId !== null
                      ? `从第 ${verses.find(v => v.ID === rangeAnchorId)?.VerseSN} 节起 → 点击结束节`
                      : '点击起始节')
                  : (selectedVerseIds.size > 0 ? `已选 ${selectedVerseIds.size} 节` : '点击经文勾选')
                }
              </div>
              
              {/* All Buttons in One Row */}
              <div className="flex items-center gap-2 pb-safe">
                <button
                  onClick={() => { setCopyModeType('range'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    copyModeType === 'range'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-warm-100 dark:bg-[#252018] text-text-secondary dark:text-[#d4c4b0]'
                  }`}
                >
                  连续
                </button>
                <button
                  onClick={() => { setCopyModeType('free'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    copyModeType === 'free'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-warm-100 dark:bg-[#252018] text-text-secondary dark:text-[#d4c4b0]'
                  }`}
                >
                  随意
                </button>
                <button
                  onClick={exitCopyMode}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-warm-100 dark:bg-[#252018] text-text-secondary dark:text-[#d4c4b0] active:scale-95 transition-transform"
                >
                  取消
                </button>
                <button
                  onClick={handleCopySelected}
                  disabled={selectedVerseIds.size === 0}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    selectedVerseIds.size === 0
                      ? 'bg-warm-100 dark:bg-[#252018] text-text-muted cursor-not-allowed'
                      : copySuccess
                        ? 'bg-green-500 text-white scale-95'
                        : 'bg-primary-600 text-white active:scale-95 shadow-sm'
                  }`}
                >
                  {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copySuccess ? '已复制' : `复制${selectedVerseIds.size > 0 ? `(${selectedVerseIds.size})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Book Selection Modal */}
      {showBookModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-[#1e1a14] flex flex-col">
            <div className="h-14 border-b border-border dark:border-[#4a3f30] flex items-center justify-between px-4">
                <div className="flex items-center">
                    {(modalView === 'chapters' || modalView === 'verses') && (
                        <button onClick={() => setModalView(modalView === 'chapters' ? 'books' : 'chapters')} className="mr-2">
                            <ChevronLeft className="w-6 h-6 text-text-muted" />
                        </button>
                    )}
                    <h2 className="text-lg font-bold dark:text-white">
                        {modalView === 'books' ? '选择经卷' : modalView === 'chapters' ? `${currentBook?.FullName} - 选择章节` : `${currentBook?.FullName} ${currentChapter} - 选择节`}
                    </h2>
                </div>
                <button onClick={() => setShowBookModal(false)} className="p-2">
                    <X className="w-6 h-6 text-text-muted" />
                </button>
            </div>
            
            {modalView === 'books' ? (
                <>
                    {/* Header with tabs and category toggle */}
                    <div className="flex items-center border-b border-border dark:border-[#4a3f30]">
                        <button
                            className={`flex-1 py-3 text-center font-medium text-sm ${bookTab === 'old' && !showCategory ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-muted dark:text-[#a89880]'}`}
                            onClick={() => { setBookTab('old'); setShowCategory(false); }}
                        >
                            旧约
                        </button>
                        <button
                            className={`flex-1 py-3 text-center font-medium text-sm ${bookTab === 'new' && !showCategory ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-muted dark:text-[#a89880]'}`}
                            onClick={() => { setBookTab('new'); setShowCategory(false); }}
                        >
                            新约
                        </button>
                        <button
                            onClick={() => setShowCategory(!showCategory)}
                            className={`px-3 py-1.5 m-1 rounded-lg text-xs font-medium transition-colors ${
                                showCategory
                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                    : 'bg-warm-100 dark:bg-[#252018] text-text-muted'
                            }`}
                        >
                            {showCategory ? '按类别' : '按顺序'}
                        </button>
                    </div>

                    {/* Book Grid */}
                    <div className="flex-1 overflow-y-auto p-4 pb-16">
                        {showCategory ? (
                            <div className="space-y-4 pb-8">
                                {BOOK_CATEGORIES.map(cat => {
                                    const catBooks = books.filter(b => cat.books.includes(b.SN));
                                    if (catBooks.length === 0) return null;
                                    return (
                                        <div key={cat.name}>
                                            <div className="text-xs font-semibold text-text-muted uppercase mb-2 px-1">{cat.name}</div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {catBooks.map(book => (
                                                    <button
                                                        key={book.SN}
                                                        onClick={() => handleBookSelect(book)}
                                                        className={`p-2 rounded-xl flex flex-col items-center justify-center border min-h-[3.5rem] ${
                                                            currentBook?.SN === book.SN
                                                                ? 'bg-primary-600 border-primary-700 text-white dark:bg-primary-500 dark:border-primary-400'
                                                                : 'bg-white border-border dark:bg-[#252018] dark:border-[#4a3f30]'
                                                        }`}
                                                    >
                                                        <span className={`text-base font-bold mb-0.5 whitespace-nowrap ${
                                                            currentBook?.SN === book.SN
                                                                ? 'text-white dark:text-[#f5ece0]'
                                                                : 'text-primary-600 dark:text-primary-400'
                                                        }`}>
                                                            {getBookShortName(book.FullName)}
                                                        </span>
                                                        <span className={`text-[8px] text-center leading-2 px-0.5 ${
                                                            currentBook?.SN === book.SN
                                                                ? 'text-white/90 dark:text-[#f5ece0]/90'
                                                                : 'text-text-secondary dark:text-[#d4c4b0]'
                                                        }`}>
                                                            {book.FullName}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2 pb-8">
                                {(bookTab === 'old' ? oldTestament : newTestament).map(book => (
                                    <button
                                        key={book.SN}
                                        onClick={() => handleBookSelect(book)}
                                        className={`p-2 rounded-xl flex flex-col items-center justify-center border min-h-[4rem] ${
                                            currentBook?.SN === book.SN
                                                ? 'bg-primary-600 border-primary-700 text-white dark:bg-primary-500 dark:border-primary-400'
                                                : 'bg-white border-border dark:bg-[#252018] dark:border-[#4a3f30]'
                                        }`}
                                    >
                                        <span className={`text-lg font-bold mb-0.5 whitespace-nowrap ${
                                            currentBook?.SN === book.SN
                                                ? 'text-white dark:text-[#f5ece0]'
                                                : 'text-primary-600 dark:text-primary-400'
                                        }`}>
                                            {getBookShortName(book.FullName)}
                                        </span>
                                        <span className={`text-[9px] text-center leading-3 px-0.5 ${
                                            currentBook?.SN === book.SN
                                                ? 'text-white/90 dark:text-[#f5ece0]/90'
                                                : 'text-text-secondary dark:text-[#d4c4b0]'
                                        }`}>
                                            {book.FullName}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : modalView === 'chapters' ? (
                /* Chapter Grid */
                <div className="flex-1 overflow-y-auto p-4 pb-16">
                    <div className="grid grid-cols-4 gap-2 pb-8">
                        {currentBook && Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                onClick={() => handleChapterSelect(num)}
                                className={`p-3 rounded-xl text-sm font-medium text-center border ${
                                    currentChapter === num
                                        ? 'bg-primary-600 text-white border-primary-700 dark:bg-primary-500 dark:border-primary-400' 
                                        : 'bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30]'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* Verse Grid */
                <div className="flex-1 overflow-y-auto p-4 pb-16">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2 pb-8">
                            {verses.map(verse => (
                                <button
                                    key={verse.VerseSN}
                                    onClick={() => handleVerseSelect(verse.VerseSN)}
                                    className="p-3 rounded-xl text-sm font-medium text-center border bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30] hover:bg-primary-50 dark:hover:bg-primary-900/30"
                                >
                                    {verse.VerseSN}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

      {/* Mobile Search Modal */}
      {showSearchModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-[#1e1a14] flex flex-col">
            <div className="h-14 border-b border-border dark:border-[#4a3f30] flex items-center justify-between px-4">
                <h2 className="text-lg font-bold dark:text-white">搜索经文</h2>
                <button onClick={() => setShowSearchModal(false)} className="p-2">
                    <X className="w-6 h-6 text-text-muted" />
                </button>
            </div>
            
            <div className="p-4 border-b border-border dark:border-[#4a3f30]">
                <form onSubmit={(e) => {
                    handleSearch(e);
                    // Keep modal open to show results
                }} className="relative">
                    <input
                        type="text"
                        placeholder="输入关键词..."
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-warm-100 dark:bg-[#252018] border-none focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-text-muted" />
                    {(searchQuery || searchResults.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-3.5 hover:bg-warm-200 dark:hover:bg-[#352c20] rounded-full p-0.5"
                      >
                        <X className="w-5 h-5 text-text-muted" />
                      </button>
                    )}
                </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                   <div className="flex justify-center py-10">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                   </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-3">
                        <div className="px-1 text-xs font-semibold text-text-muted uppercase">找到 {searchResults.length} 条结果</div>
                        {searchResults.map(verse => {
                            const book = books.find(b => b.SN === verse.VolumeSN);
                            return (
                                <button
                                    key={verse.ID}
                                    onClick={() => {
                                        if (book) {
                                            setCurrentBook(book);
                                            setCurrentChapter(verse.ChapterSN);
                                            setHighlightedVerseId(verse.ID);
                                            setShowSearchModal(false);
                                            // 延迟滚动，等待章节加载完成
                                            setTimeout(() => {
                                                const verseElement = verseRefs.current.get(verse.ID);
                                                if (verseElement) {
                                                    verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }, 300);
                                        }
                                    }}
                                    className="w-full text-left p-3.5 rounded-xl bg-warm-50 dark:bg-[#252018]/50 border border-border-light dark:border-[#4a3f30]"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-primary-600 dark:text-primary-400">{book?.ShortName} {verse.ChapterSN}:{verse.VerseSN}</span>
                                    </div>
                                    <p className="text-text-secondary dark:text-[#d4c4b0] leading-relaxed text-sm line-clamp-2">{parseVerseLection(verse.Lection).chinese}</p>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                        <Search className="w-12 h-12 mb-2 opacity-20" />
                        <p>输入经文或关键词搜索</p>
                    </div>
                )}
            </div>
        </div>
      )}
      
      {/* Desktop Chapter Selection Modal */}
      {showDesktopChapterModal && (
        <div className="hidden md:flex fixed inset-0 z-[60] bg-black/50 items-center justify-center" onClick={() => setShowDesktopChapterModal(false)}>
            <div className="bg-white dark:bg-[#1e1a14] rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-border dark:border-[#4a3f30] flex items-center justify-between">
                    <h2 className="text-xl font-bold dark:text-white">{currentBook?.FullName} - 选择章</h2>
                    <button onClick={() => setShowDesktopChapterModal(false)} className="p-2 hover:bg-warm-100 dark:hover:bg-[#252018] rounded-full">
                        <X className="w-6 h-6 text-text-muted" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)]">
                    <div className="grid grid-cols-8 gap-3">
                        {currentBook && Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                onClick={() => handleDesktopChapterSelect(num)}
                                className={`p-4 rounded-xl text-base font-medium text-center border transition-all ${
                                    currentChapter === num
                                        ? 'bg-primary-600 text-white border-primary-700 dark:bg-primary-500 dark:border-primary-400 shadow-lg scale-105' 
                                        : 'bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30] hover:bg-primary-50 dark:hover:bg-primary-900/30'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* Desktop Verse Selection Modal */}
      {showDesktopVerseModal && (
        <div className="hidden md:flex fixed inset-0 z-[60] bg-black/50 items-center justify-center" onClick={() => setShowDesktopVerseModal(false)}>
            <div className="bg-white dark:bg-[#1e1a14] rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-border dark:border-[#4a3f30] flex items-center justify-between">
                    <h2 className="text-xl font-bold dark:text-white">{currentBook?.FullName} {currentChapter} - 选择节</h2>
                    <button onClick={() => setShowDesktopVerseModal(false)} className="p-2 hover:bg-warm-100 dark:hover:bg-[#252018] rounded-full">
                        <X className="w-6 h-6 text-text-muted" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-10 gap-3">
                            {verses.map(verse => (
                                <button
                                    key={verse.VerseSN}
                                    onClick={() => handleDesktopVerseSelect(verse.VerseSN)}
                                    className="p-4 rounded-xl text-base font-medium text-center border bg-white text-text-secondary border-border dark:bg-[#252018] dark:text-[#d4c4b0] dark:border-[#4a3f30] hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
                                >
                                    {verse.VerseSN}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
