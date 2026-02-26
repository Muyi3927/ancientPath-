import React, { useState, useEffect, useRef, useContext } from 'react';
import { getBooks, getVerses, BibleBook, BibleVerse, searchVerses, BibleVersion } from '../services/BibleService';
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
  const [highlightedVerseId, setHighlightedVerseId] = useState<number | null>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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
      .map(v => `【${shortName} ${currentChapter}:${v.VerseSN}】${v.Lection}`)
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
  const [modalView, setModalView] = useState<'books' | 'chapters' | 'verses'>('books');
  const versesContainerRef = useRef<HTMLDivElement>(null);
  
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
      setMenuVisible(false); // 收起菜单栏
      
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
                  
                  versesContainerRef.current.scrollTo({
                      top: offset,
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
      setMenuVisible(false); // 收起菜单栏
      
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
                  
                  versesContainerRef.current.scrollTo({
                      top: offset,
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
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Desktop Sidebar - Book List (Hidden on Mobile) */}
      <div className={`hidden md:flex ${sidebarOpen && isMenuVisible ? 'w-80' : 'w-0'} pt-32 transition-all duration-500 ease-in-out bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col relative z-20 h-full overflow-hidden`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="搜索经文..."
              className="w-full pl-9 pr-9 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            {(searchQuery || searchResults.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            )}
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {searchResults.length > 0 ? (
             <div className="space-y-1">
               <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">搜索结果 ({searchResults.length})</div>
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
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                      >
                          <span className="font-bold text-blue-600">{book?.ShortName} {verse.ChapterSN}:{verse.VerseSN}</span>
                          <p className="text-gray-600 dark:text-gray-300 truncate">{verse.Lection}</p>
                      </button>
                  )
               })}
             </div>
          ) : (
              <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase mt-2">旧约</div>
                  <div className="grid grid-cols-3 gap-2 px-2">
                      {oldTestament.map(book => (
                      <button
                          key={book.SN}
                          onClick={() => handleBookSelect(book)}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center border min-h-[3.5rem] ${currentBook?.SN === book.SN ? 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400' : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                      >
                          <span className={`text-base font-bold mb-0.5 whitespace-nowrap ${currentBook?.SN === book.SN ? 'text-white dark:text-gray-900' : 'text-blue-600 dark:text-blue-400'}`}>{getBookShortName(book.FullName)}</span>
                          <span className={`text-[9px] text-center leading-3 ${currentBook?.SN === book.SN ? 'text-white/90 dark:text-gray-900/90' : 'text-gray-600 dark:text-gray-300'}`}>{book.FullName}</span>
                      </button>
                      ))}
                  </div>
                  
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase mt-4">新约</div>
                  <div className="grid grid-cols-3 gap-2 px-2 pb-4">
                      {newTestament.map(book => (
                      <button
                          key={book.SN}
                          onClick={() => handleBookSelect(book)}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center border min-h-[3.5rem] ${currentBook?.SN === book.SN ? 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400' : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                      >
                          <span className={`text-base font-bold mb-0.5 whitespace-nowrap ${currentBook?.SN === book.SN ? 'text-white dark:text-gray-900' : 'text-blue-600 dark:text-blue-400'}`}>{getBookShortName(book.FullName)}</span>
                          <span className={`text-[9px] text-center leading-3 ${currentBook?.SN === book.SN ? 'text-white/90 dark:text-gray-900/90' : 'text-gray-600 dark:text-gray-300'}`}>{book.FullName}</span>
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
        <div className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-0 select-none">
           <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
             {version === 'cuv' ? '和合本' : version === 'ncv' ? '新译本' : 'ASV'} · {currentBook?.FullName} {currentChapter}章
           </span>
        </div>

        {/* Header */}
        <div className={`absolute top-0 md:top-16 left-0 right-0 h-14 md:h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10 flex-shrink-0 transition-all duration-500 ease-in-out ${!isMenuVisible ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
          <div className="flex items-center flex-1 min-w-0 mr-2">
              <button 
                  className="hidden md:block mr-4 p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              {/* Mobile Book Selector Trigger */}
              <button 
                className="md:hidden flex items-center text-left min-w-0"
                onClick={() => {
                    setShowBookModal(true);
                    setModalView('books');
                }}
              >
                 <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {currentBook?.FullName} {currentChapter}
                 </h1>
                 <ChevronRight className="w-4 h-4 ml-1 flex-shrink-0 text-gray-400" />
              </button>

              {/* Desktop Title */}
              <h1 className="hidden md:block text-xl font-bold text-gray-900 dark:text-white">
                {currentBook?.FullName} 第 {currentChapter} 章
              </h1>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Mobile Search Button */}
            <button 
                onClick={() => setShowSearchModal(true)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Copy Verse Button */}
            <button
              onClick={() => isCopyMode ? exitCopyMode() : setIsCopyMode(true)}
              title={isCopyMode ? '退出复制模式' : '复制经文'}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-sm font-medium transition-all mr-1 border ${
                isCopyMode
                  ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span className="hidden lg:inline">{isCopyMode ? '退出复制' : '复制经文'}</span>
            </button>

            {/* Font Size Control - Icon buttons matching app */}
            <div className="flex items-center gap-0.5 md:gap-1 mr-1 md:mr-2">
                 <button 
                    onClick={decreaseFont} 
                    className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="减小字体"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                 </button>
                 <span className="hidden md:inline text-[10px] font-mono px-1 text-gray-500 dark:text-gray-400">{(fontSizeScale * 100).toFixed(0)}%</span>
                 <button 
                    onClick={increaseFont} 
                    className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="放大字体"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                 </button>
            </div>

            <select
                value={version}
                onChange={(e) => setVersion(e.target.value as BibleVersion)}
                className="bg-gray-100 dark:bg-gray-800 border-none rounded-md py-1 px-2 text-[10px] md:text-sm focus:ring-2 focus:ring-blue-500 dark:text-white mr-1 md:mr-2"
            >
                <option value="cuv">和合本</option>
                <option value="asv">ASV</option>
                {isAdmin && <option value="ncv">新译本</option>}
            </select>

            <button 
              onClick={handlePrevChapter}
              className="hidden md:block p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={!currentBook || (currentBook.SN === 1 && currentChapter === 1)}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            {/* Desktop Chapter & Verse Select Buttons */}
            <button
              onClick={() => setShowDesktopChapterModal(true)}
              className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md py-1 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
            >
              {currentChapter} 章
              <ChevronRight className="w-3 h-3" />
            </button>
            
            <button
              onClick={() => setShowDesktopVerseModal(true)}
              className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md py-1 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
            >
              节
              <ChevronRight className="w-3 h-3" />
            </button>

            <button 
              onClick={handleNextChapter}
              className="hidden md:block p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={!currentBook || (currentBook.SN === 66 && currentChapter === 22)}
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Verses Area */}
        <div 
          ref={versesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-36 bg-white dark:bg-gray-900 cursor-pointer"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                                ? 'bg-blue-100 dark:bg-blue-800/40 ring-1 ring-inset ring-blue-400'
                                : 'bg-blue-50 dark:bg-blue-900/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`
                        : isHighlighted 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 shadow-lg cursor-pointer' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {isCopyMode && (
                      <div className="w-5 flex-shrink-0 flex items-start pt-1.5 mr-1">
                        {isSelected
                          ? <CheckSquare className={`w-4 h-4 ${isAnchor ? 'text-blue-700 dark:text-blue-300' : 'text-blue-500 dark:text-blue-400'}`} />
                          : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        }
                      </div>
                    )}
                    <span className="text-xs text-gray-400 w-6 md:w-8 pt-2 select-none flex-shrink-0">{verse.VerseSN}</span>
                    <p 
                      className={`leading-relaxed font-serif flex-1 transition-all duration-200 ${
                        (isCopyMode && isSelected) || isHighlighted
                          ? 'text-gray-900 dark:text-gray-100 font-medium' 
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                      style={{ fontSize: `${fontSizeScale}rem`, lineHeight: '1.6' }}
                    >
                      {verse.Lection}
                    </p>
                  </div>
                );
              })}

              {/* Bottom Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrevChapter();
                    }}
                    disabled={!currentBook || (currentBook.SN === 1 && currentChapter === 1)}
                    className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                        (!currentBook || (currentBook.SN === 1 && currentChapter === 1))
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700'
                        : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
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
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700'
                        : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
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
          <div className="hidden md:flex border-t border-gray-200 dark:border-gray-700 px-6 py-3 items-center justify-between bg-white dark:bg-gray-900 shadow-[0_-4px_16px_rgba(0,0,0,0.07)] flex-shrink-0 z-10">
            <div className="flex items-center gap-4">
              {/* 选择模式切换 */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => { setCopyModeType('range'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    copyModeType === 'range'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  连续选择
                </button>
                <button
                  onClick={() => { setCopyModeType('free'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    copyModeType === 'free'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  随意选择
                </button>
              </div>
              {/* 操作提示 */}
              <span className="text-sm text-gray-500 dark:text-gray-400">
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
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : copySuccess
                      ? 'bg-green-500 text-white scale-95'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'
                }`}
              >
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? '已复制！' : `复制${selectedVerseIds.size > 0 ? `（${selectedVerseIds.size}节）` : ''}`}
              </button>
              <button
                onClick={exitCopyMode}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Copy Mode Action Panel - Mobile */}
        {isCopyMode && (
          <div className="md:hidden fixed bottom-20 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 animate-slide-up rounded-t-2xl">
            <div className="px-4 py-3 space-y-2">
              {/* Status Hint */}
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
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
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  连续
                </button>
                <button
                  onClick={() => { setCopyModeType('free'); setSelectedVerseIds(new Set()); setRangeAnchorId(null); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    copyModeType === 'free'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  随意
                </button>
                <button
                  onClick={exitCopyMode}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
                >
                  取消
                </button>
                <button
                  onClick={handleCopySelected}
                  disabled={selectedVerseIds.size === 0}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    selectedVerseIds.size === 0
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : copySuccess
                        ? 'bg-green-500 text-white scale-95'
                        : 'bg-blue-600 text-white active:scale-95 shadow-sm'
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
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
            <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4">
                <div className="flex items-center">
                    {(modalView === 'chapters' || modalView === 'verses') && (
                        <button onClick={() => setModalView(modalView === 'chapters' ? 'books' : 'chapters')} className="mr-2">
                            <ChevronLeft className="w-6 h-6 text-gray-500" />
                        </button>
                    )}
                    <h2 className="text-lg font-bold dark:text-white">
                        {modalView === 'books' ? '选择经卷' : modalView === 'chapters' ? `${currentBook?.FullName} - 选择章节` : `${currentBook?.FullName} ${currentChapter} - 选择节`}
                    </h2>
                </div>
                <button onClick={() => setShowBookModal(false)} className="p-2">
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>
            
            {modalView === 'books' ? (
                <>
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-800">
                        <button 
                            className={`flex-1 py-3 text-center font-medium ${bookTab === 'old' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setBookTab('old')}
                        >
                            旧约
                        </button>
                        <button 
                            className={`flex-1 py-3 text-center font-medium ${bookTab === 'new' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                            onClick={() => setBookTab('new')}
                        >
                            新约
                        </button>
                    </div>

                    {/* Book Grid */}
                    <div className="flex-1 overflow-y-auto p-4 pb-16">
                        <div className="grid grid-cols-5 gap-3 pb-8">
                            {(bookTab === 'old' ? oldTestament : newTestament).map(book => (
                                <button
                                    key={book.SN}
                                    onClick={() => handleBookSelect(book)}
                                    className={`p-2 rounded-xl flex flex-col items-center justify-center border min-h-[4rem] ${
                                        currentBook?.SN === book.SN 
                                            ? 'bg-blue-600 border-blue-700 text-white dark:bg-blue-500 dark:border-blue-400' 
                                            : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                                    }`}
                                >
                                    <span className={`text-lg font-bold mb-0.5 whitespace-nowrap ${
                                        currentBook?.SN === book.SN
                                            ? 'text-white dark:text-gray-900'
                                            : 'text-blue-600 dark:text-blue-400'
                                    }`}>
                                        {getBookShortName(book.FullName)}
                                    </span>
                                    <span className={`text-[9px] text-center leading-3 px-0.5 ${
                                        currentBook?.SN === book.SN
                                            ? 'text-white/90 dark:text-gray-900/90'
                                            : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {book.FullName}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            ) : modalView === 'chapters' ? (
                /* Chapter Grid */
                <div className="flex-1 overflow-y-auto p-4 pb-16">
                    <div className="grid grid-cols-5 gap-3 pb-8">
                        {currentBook && Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                onClick={() => handleChapterSelect(num)}
                                className={`p-3 rounded-xl text-sm font-medium text-center border ${
                                    currentChapter === num
                                        ? 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400' 
                                        : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
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
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 gap-3 pb-8">
                            {verses.map(verse => (
                                <button
                                    key={verse.VerseSN}
                                    onClick={() => handleVerseSelect(verse.VerseSN)}
                                    className="p-3 rounded-xl text-sm font-medium text-center border bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
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
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
            <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4">
                <h2 className="text-lg font-bold dark:text-white">搜索经文</h2>
                <button onClick={() => setShowSearchModal(false)} className="p-2">
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <form onSubmit={(e) => {
                    handleSearch(e);
                    // Keep modal open to show results
                }} className="relative">
                    <input
                        type="text"
                        placeholder="输入关键词..."
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    {(searchQuery || searchResults.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-3.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    )}
                </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                   <div className="flex justify-center py-10">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                   </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-3">
                        <div className="px-1 text-xs font-semibold text-gray-500 uppercase">找到 {searchResults.length} 条结果</div>
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
                                    className="w-full text-left p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-blue-600 dark:text-blue-400">{book?.ShortName} {verse.ChapterSN}:{verse.VerseSN}</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm line-clamp-2">{verse.Lection}</p>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold dark:text-white">{currentBook?.FullName} - 选择章</h2>
                    <button onClick={() => setShowDesktopChapterModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
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
                                        ? 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400 shadow-lg scale-105' 
                                        : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold dark:text-white">{currentBook?.FullName} {currentChapter} - 选择节</h2>
                    <button onClick={() => setShowDesktopVerseModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-10 gap-3">
                            {verses.map(verse => (
                                <button
                                    key={verse.VerseSN}
                                    onClick={() => handleDesktopVerseSelect(verse.VerseSN)}
                                    className="p-4 rounded-xl text-base font-medium text-center border bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
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
