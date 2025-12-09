import React, { useState, useEffect, useRef, useContext } from 'react';
import { getBooks, getVerses, BibleBook, BibleVerse, searchVerses, BibleVersion } from '../services/BibleService';
import { Book, Search, ChevronLeft, ChevronRight, Menu, X, Type } from 'lucide-react';
import { LayoutContext } from '../App';

export const Bible: React.FC = () => {
  const { isMenuVisible, setMenuVisible } = useContext(LayoutContext);
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
  const [fontSize, setFontSize] = useState(18);
  
  // Mobile Modal States
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookTab, setBookTab] = useState<'old' | 'new'>('old');
  const [modalView, setModalView] = useState<'books' | 'chapters'>('books');
  const versesContainerRef = useRef<HTMLDivElement>(null);

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
        .then(setVerses)
        .catch(console.error)
        .finally(() => {
          setLoading(false);
          // Scroll to top when chapter changes
          if (versesContainerRef.current) {
            versesContainerRef.current.scrollTop = 0;
          }
        });
    }
  }, [currentBook, currentChapter, version]);

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
    setSearchResults([]);
    if (window.innerWidth < 768) {
        setSidebarOpen(false);
        setModalView('chapters'); // Switch to chapter selection on mobile
    }
  };

  const handleChapterSelect = (chapter: number) => {
      setCurrentChapter(chapter);
      setShowBookModal(false);
      setModalView('books'); // Reset for next time
  };

  const handlePrevChapter = () => {
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

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Desktop Sidebar - Book List (Hidden on Mobile) */}
      <div className={`hidden md:flex ${sidebarOpen && isMenuVisible ? 'w-64' : 'w-0'} pt-32 transition-all duration-500 ease-in-out bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col relative z-20 h-full overflow-hidden`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="搜索经文..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {searchResults.length > 0 ? (
             <div className="space-y-1">
               <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">搜索结果</div>
               {searchResults.map(verse => {
                  const book = books.find(b => b.SN === verse.VolumeSN);
                  return (
                      <button
                          key={verse.ID}
                          onClick={() => {
                              if (book) {
                                  setCurrentBook(book);
                                  setCurrentChapter(verse.ChapterSN);
                                  setSearchResults([]);
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
                  {oldTestament.map(book => (
                  <button
                      key={book.SN}
                      onClick={() => handleBookSelect(book)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 ${currentBook?.SN === book.SN ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                      {book.FullName}
                  </button>
                  ))}
                  
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase mt-4">新约</div>
                  {newTestament.map(book => (
                  <button
                      key={book.SN}
                      onClick={() => handleBookSelect(book)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 ${currentBook?.SN === book.SN ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                      {book.FullName}
                  </button>
                  ))}
              </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Persistent Info Bar (Always visible, sits behind the main header) */}
        <div className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-0 select-none">
           <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
             {version === 'cuv' ? '和合本' : 'ASV'} · {currentBook?.FullName} {currentChapter}章
           </span>
        </div>

        {/* Header */}
        <div className={`absolute left-0 right-0 h-14 md:h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10 flex-shrink-0 transition-all duration-500 ease-in-out ${!isMenuVisible ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`} style={{ top: '64px' }}>
          <div className="flex items-center flex-1 min-w-0">
              <button 
                  className="hidden md:block mr-4 p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              {/* Mobile Book Selector Trigger */}
              <button 
                className="md:hidden flex items-center text-left"
                onClick={() => {
                    setShowBookModal(true);
                    setModalView('books');
                }}
              >
                 <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {currentBook?.FullName} {currentChapter}
                 </h1>
                 <ChevronRight className="w-4 h-4 ml-1 text-gray-400" />
              </button>

              {/* Desktop Title */}
              <h1 className="hidden md:block text-xl font-bold text-gray-900 dark:text-white">
                {currentBook?.FullName} 第 {currentChapter} 章
              </h1>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setFontSize(s => s >= 26 ? 16 : s + 2)}
              className="p-1.5 md:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 mr-1"
              title="调整字体大小"
            >
              <Type className="w-5 h-5" />
            </button>

            <select
                value={version}
                onChange={(e) => setVersion(e.target.value as BibleVersion)}
                className="bg-gray-100 dark:bg-gray-800 border-none rounded-md py-1 px-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 dark:text-white mr-1 md:mr-2"
            >
                <option value="cuv">和合本</option>
                <option value="asv">ASV</option>
            </select>

            <button 
              onClick={handlePrevChapter}
              className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={!currentBook || (currentBook.SN === 1 && currentChapter === 1)}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            {/* Desktop Chapter Select */}
            <select 
              value={currentChapter}
              onChange={(e) => setCurrentChapter(Number(e.target.value))}
              className="hidden md:block bg-gray-100 dark:bg-gray-800 border-none rounded-md py-1 px-2 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              {currentBook && Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>第 {num} 章</option>
              ))}
            </select>

            <button 
              onClick={handleNextChapter}
              className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={!currentBook || (currentBook.SN === 66 && currentChapter === 22)}
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Verses Area */}
        <div 
          ref={versesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 pt-32 md:pt-36 bg-white dark:bg-gray-900 cursor-pointer"
          onClick={() => setMenuVisible(!isMenuVisible)}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4 pb-20">
              {verses.map(verse => (
                <div key={verse.ID} className="flex group hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors">
                  <span className="text-xs text-gray-400 w-6 md:w-8 pt-1.5 select-none flex-shrink-0">{verse.VerseSN}</span>
                  <p 
                    className="text-gray-800 dark:text-gray-200 leading-relaxed font-serif flex-1 transition-all duration-200"
                    style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
                  >
                    {verse.Lection}
                  </p>
                </div>
              ))}

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
      </div>

      {/* Mobile Book Selection Modal */}
      {showBookModal && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
            <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4">
                <div className="flex items-center">
                    {modalView === 'chapters' && (
                        <button onClick={() => setModalView('books')} className="mr-2">
                            <ChevronLeft className="w-6 h-6 text-gray-500" />
                        </button>
                    )}
                    <h2 className="text-lg font-bold dark:text-white">
                        {modalView === 'books' ? '选择经卷' : `${currentBook?.FullName} - 选择章节`}
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
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-4 gap-3">
                            {(bookTab === 'old' ? oldTestament : newTestament).map(book => (
                                <button
                                    key={book.SN}
                                    onClick={() => handleBookSelect(book)}
                                    className={`p-2 rounded-lg text-sm text-center truncate ${
                                        currentBook?.SN === book.SN 
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {book.ShortName}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                /* Chapter Grid */
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-5 gap-3">
                        {currentBook && Array.from({ length: currentBook.ChapterNumber }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                onClick={() => handleChapterSelect(num)}
                                className={`p-3 rounded-lg text-sm font-medium text-center ${
                                    currentChapter === num
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
