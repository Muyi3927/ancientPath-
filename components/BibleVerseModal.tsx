import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { getVerses, getBooks, BibleVerse, BibleVersion, parseVerseLection } from '../services/BibleService';

interface BibleVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string; // e.g., "太3:16" or "路1:3-6"
  version?: BibleVersion;
  onVersionChange?: (version: BibleVersion) => void;
  isAdmin?: boolean;
}

// 书卷简称到ID的映射
const BOOK_NAME_MAP: Record<string, number> = {
  // 新约
  '太': 40, '马太福音': 40,
  '可': 41, '马可福音': 41,
  '路': 42, '路加福音': 42,
  '约': 43, '约翰福音': 43,
  '徒': 44, '使徒行传': 44,
  '罗': 45, '罗马书': 45,
  '林前': 46, '哥林多前书': 46,
  '林后': 47, '哥林多后书': 47,
  '加': 48, '加拉太书': 48,
  '弗': 49, '以弗所书': 49,
  '腓': 50, '腓立比书': 50,
  '西': 51, '歌罗西书': 51,
  '帖前': 52, '帖撒罗尼迦前书': 52,
  '帖后': 53, '帖撒罗尼迦后书': 53,
  '提前': 54, '提摩太前书': 54,
  '提后': 55, '提摩太后书': 55,
  '多': 56, '提多书': 56,
  '门': 57, '腓利门书': 57,
  '来': 58, '希伯来书': 58,
  '雅': 59, '雅各书': 59,
  '彼前': 60, '彼得前书': 60,
  '彼后': 61, '彼得后书': 61,
  '约一': 62, '约翰一书': 62, '约壹': 62,
  '约二': 63, '约翰二书': 63, '约贰': 63,
  '约三': 64, '约翰三书': 64, '约叁': 64,
  '犹': 65, '犹大书': 65,
  '启': 66, '启示录': 66,
  // 旧约
  '创': 1, '创世记': 1,
  '出': 2, '出埃及记': 2,
  '利': 3, '利未记': 3,
  '民': 4, '民数记': 4,
  '申': 5, '申命记': 5,
  '书': 6, '约书亚记': 6,
  '士': 7, '士师记': 7,
  '得': 8, '路得记': 8,
  '撒上': 9, '撒母耳记上': 9,
  '撒下': 10, '撒母耳记下': 10,
  '王上': 11, '列王纪上': 11,
  '王下': 12, '列王纪下': 12,
  '代上': 13, '历代志上': 13,
  '代下': 14, '历代志下': 14,
  '拉': 15, '以斯拉记': 15,
  '尼': 16, '尼希米记': 16,
  '斯': 17, '以斯帖记': 17,
  '伯': 18, '约伯记': 18,
  '诗': 19, '诗篇': 19,
  '箴': 20, '箴言': 20,
  '传': 21, '传道书': 21,
  '歌': 22, '雅歌': 22,
  '赛': 23, '以赛亚书': 23,
  '耶': 24, '耶利米书': 24,
  '哀': 25, '耶利米哀歌': 25,
  '结': 26, '以西结书': 26,
  '但': 27, '但以理书': 27,
  '何': 28, '何西阿书': 28,
  '珥': 29, '约珥书': 29,
  '摩': 30, '阿摩司书': 30,
  '俄': 31, '俄巴底亚书': 31,
  '拿': 32, '约拿书': 32,
  '弥': 33, '弥迦书': 33,
  '鸿': 34, '那鸿书': 34,
  '哈': 35, '哈巴谷书': 35,
  '番': 36, '西番雅书': 36,
  '该': 37, '哈该书': 37,
  '亚': 38, '撒迦': 38, '撒迦利亚书': 38,
  '玛': 39, '玛拉基书': 39,
};

// ID到书卷名的映射（用于显示）
const BOOK_ID_TO_NAME: Record<number, string> = {
  1: '创世记', 2: '出埃及记', 3: '利未记', 4: '民数记', 5: '申命记',
  6: '约书亚记', 7: '士师记', 8: '路得记', 9: '撒母耳上', 10: '撒母耳下',
  11: '列王纪上', 12: '列王纪下', 13: '历代志上', 14: '历代志下', 15: '以斯拉记',
  16: '尼希米记', 17: '以斯帖记', 18: '约伯记', 19: '诗篇', 20: '箴言',
  21: '传道书', 22: '雅歌', 23: '以赛亚书', 24: '耶利米书', 25: '耶利米哀歌',
  26: '以西结书', 27: '但以理书', 28: '何西阿书', 29: '约珥书', 30: '阿摩司书',
  31: '俄巴底亚书', 32: '约拿书', 33: '弥迦书', 34: '那鸿书', 35: '哈巴谷书',
  36: '西番雅书', 37: '哈该书', 38: '撒迦利亚书', 39: '玛拉基书', 40: '马太福音',
  41: '马可福音', 42: '路加福音', 43: '约翰福音', 44: '使徒行传', 45: '罗马书',
  46: '哥林多前书', 47: '哥林多后书', 48: '加拉太书', 49: '以弗所书', 50: '腓立比书',
  51: '歌罗西书', 52: '帖撒罗尼迦前书', 53: '帖撒罗尼迦后书', 54: '提摩太前书',
  55: '提摩太后书', 56: '提多书', 57: '腓利门书', 58: '希伯来书', 59: '雅各书',
  60: '彼得前书', 61: '彼得后书', 62: '约翰一书', 63: '约翰二书', 64: '约翰三书',
  65: '犹大书', 66: '启示录',
};

const BibleVerseModal: React.FC<BibleVerseModalProps> = ({ 
  isOpen, 
  onClose, 
  reference,
  version = 'cuv',
  onVersionChange,
  isAdmin = false
}) => {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState(0);
  const [startVerse, setStartVerse] = useState(0);
  const [endVerse, setEndVerse] = useState(0);

  // 解析经文引用，如 "太3:16"、"路1:3-6"、"创3"、"《传道书》4章 9 节"
  const parseReference = (ref: string): { bookId: number | null; chapter: number; startVerse: number | null; endVerse: number | null } | null => {
    // 移除括号与书名号
    const cleanRef = ref.replace(/[《》【】\[\]()（）]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanRef) return null;

    // 优先匹配：书卷 + 章:节(-节)
    let match = cleanRef.match(/^([^:0-9]+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*-\s*(\d+))?$/);
    if (match) {
      const bookNamePart = match[1].trim();
      const chap = parseInt(match[2], 10);
      const startVers = parseInt(match[3], 10);
      const endVers = match[4] ? parseInt(match[4], 10) : startVers;
      const bookId = BOOK_NAME_MAP[bookNamePart];
      if (!bookId) return null;
      return { bookId, chapter: chap, startVerse: startVers, endVerse: endVers };
    }

    // 匹配：书卷 + 章(第)? + 节(第)?，节可选
    match = cleanRef.match(/^([^:0-9]+?)\s*第?\s*(\d+)\s*(?:章)?\s*(?:第?\s*(\d+)\s*(?:节)?)?\s*(?:-\s*(\d+)\s*节?)?$/);
    if (!match) return null;

    const bookNamePart = match[1].trim();
    const chap = parseInt(match[2], 10);
    const startVers = match[3] ? parseInt(match[3], 10) : null;
    const endVers = match[4] ? parseInt(match[4], 10) : startVers;

    const bookId = BOOK_NAME_MAP[bookNamePart];
    if (!bookId) return null;

    return { bookId, chapter: chap, startVerse: startVers, endVerse: endVers };
  };

  // 加载经文
  useEffect(() => {
    if (!isOpen || !reference) return;

    const loadVerses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const parsed = parseReference(reference);
        if (!parsed) {
          setError('无法解析经文引用');
          return;
        }

        const { bookId, chapter: chap, startVerse: startV, endVerse: endV } = parsed;
        
        setChapter(chap);
        setBookName(BOOK_ID_TO_NAME[bookId] || '');

        const fetchedVerses = await getVerses(bookId, chap, version);
        setVerses(fetchedVerses);

        if (startV === null) {
          // 仅章节：展示整章
          const maxVerse = fetchedVerses.reduce((max, v) => Math.max(max, v.VerseSN), 0);
          setStartVerse(1);
          setEndVerse(maxVerse || 1);
        } else {
          setStartVerse(startV);
          setEndVerse(endV ?? startV);
        }
      } catch (err) {
        setError('加载经文失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [isOpen, reference, version]);

  const handleCopy = () => {
    const text = verses
      .filter(v => v.VerseSN >= startVerse && v.VerseSN <= endVerse)
      .map(v => {
        const parsed = parseVerseLection(v.Lection);
        const verseHeader = `【${bookName} ${chapter}:${v.VerseSN}】`;
        if (parsed.hasBilingual) {
          return `${verseHeader}\n${parsed.chinese}\n${parsed.english}`;
        }
        return `${verseHeader}${parsed.chinese}`;
      })
      .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  const displayVerses = verses.filter(v => v.VerseSN >= startVerse && v.VerseSN <= endVerse);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 px-0 md:px-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-[720px] md:max-w-3xl h-[50vh] overflow-hidden flex flex-col mb-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {bookName} {chapter}:{startVerse}{endVerse !== startVerse ? `-${endVerse}` : ''}
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={version}
              onChange={(e) => onVersionChange?.(e.target.value as BibleVersion)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <option value="cuv">和合本</option>
              <option value="bilingual">中英对照</option>
              <option value="asv">美标本</option>
              {isAdmin && <option value="ncv">新译本</option>}
            </select>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : displayVerses.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">未找到经文</p>
          ) : (
            <div className="space-y-3">
              {displayVerses.map((verse) => (
                <div key={verse.VerseSN} className="flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0 text-lg">
                    {verse.VerseSN}
                  </span>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg flex-1">
                    {(() => {
                      const parsed = parseVerseLection(verse.Lection);
                      return parsed.hasBilingual ? (
                        <>
                          <p>{parsed.chinese}</p>
                          <p style={{ 
                            fontStyle: 'italic',
                            color: 'rgb(107, 114, 128)',
                            marginTop: '0.25rem'
                          }} className="dark:text-gray-400">
                            {parsed.english}
                          </p>
                        </>
                      ) : (
                        <p>{parsed.chinese}</p>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {displayVerses.length > 0 && (
          <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              {copied ? (
                <>
                  <Check size={18} />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={18} />
                  复制经文
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BibleVerseModal;
