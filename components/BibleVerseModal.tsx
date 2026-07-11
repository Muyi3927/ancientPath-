import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { getVerses, getBooks, BibleVerse, BibleVersion, parseVerseLection } from '../services/BibleService';

const BIBLE_FONT_SIZE_SCALE_KEY = 'bible_font_size_scale_web';

interface BibleVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string; // e.g., "太3:16" or "路1:3-6"
  version?: BibleVersion;
  onVersionChange?: (version: BibleVersion) => void;
  isAdmin?: boolean;
}

// 只有一章的书卷——裸数字视为节号而非章号
// e.g. "犹12" → 犹大书 1:12 (而非第12章)
const SINGLE_CHAPTER_BOOKS = new Set([
  31,  // 俄巴底亚书
  57,  // 腓利门书
  63,  // 约二
  64,  // 约三
  65,  // 犹大书
])

// 中文数字 → 阿拉伯数字
const ZH_DIGIT_MAP: Record<string, number> = {
  '〇': 0, '零': 0,
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9
}

function chineseToArabic(s: string): number {
  let result = 0, current = 0
  for (const ch of s) {
    if (ch === '百') { result += (current || 1) * 100; current = 0 }
    else if (ch === '十') { result += (current || 1) * 10; current = 0 }
    else if (ch in ZH_DIGIT_MAP) { current = ZH_DIGIT_MAP[ch] }
    else return NaN
  }
  const total = result + current
  return total > 0 ? total : NaN
}

const ZH_NUM_RE = '(?:[一二三四五六七八九]?百[零〇]?(?:[一二三四五六七八九]?十[一二三四五六七八九]?|[一二三四五六七八九])?|[一二三四五六七八九]?十[一二三四五六七八九]?|[一二三四五六七八九])'

/** 将章/节字符串中的中文数字和至/到统一为阿拉伯数字和 -（照抄 bible-refs.ts 的 normalizeCVStr） */
function normalizeCVStr(s: string): string {
  // 至/到 between numeral sequences → '-'
  s = s.replace(
    new RegExp(`(\\d+|${ZH_NUM_RE})\\s*[至到]\\s*(\\d+|${ZH_NUM_RE})`, 'g'),
    (_, a, b) => `${a}-${b}`
  )
  // Chinese numerals → Arabic
  s = s.replace(new RegExp(ZH_NUM_RE, 'g'), m => {
    const n = chineseToArabic(m)
    return isNaN(n) ? m : String(n)
  })
  return s
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
  const [endChapter, setEndChapter] = useState(0);
  const [startVerse, setStartVerse] = useState(0);
  const [endVerse, setEndVerse] = useState(0);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState(1.1);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BIBLE_FONT_SIZE_SCALE_KEY);
      if (!saved) return;
      const parsed = parseFloat(saved);
      if (!Number.isNaN(parsed)) {
        setFontSizeScale(Math.max(0.8, Math.min(2.0, parsed)));
      }
    } catch {
      // Ignore storage errors and keep defaults.
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowFontSizePicker(false);
    }
  }, [isOpen]);

  const changeFontSize = (delta: number) => {
    setFontSizeScale(prev => {
      const next = Math.max(0.8, Math.min(2.0, Math.round((prev + delta) * 10) / 10));
      try {
        window.localStorage.setItem(BIBLE_FONT_SIZE_SCALE_KEY, next.toString());
      } catch {
        // Ignore storage errors and still update in-memory state.
      }
      return next;
    });
  };

  const verseFontSize = Math.round(18 * fontSizeScale);
  const verseLineHeight = Math.round(30 * fontSizeScale);
  const englishFontSize = Math.max(14, Math.round(16 * fontSizeScale));
  const englishLineHeight = Math.round(26 * fontSizeScale);

  // 解析经文引用，支持格式：
  //   "太3:16"  "路1:3-6"  "太1:5-2:6"  "创3"  "犹12"
  //   "太3：1-3,5,7"  "太3：1-3；5：6-7"
  //   "《传道书》4章 9 节"  "第3章第16节"  "第3篇12节"
  //   中文数字： "路一章三节" → 路1:3
  //   单章书卷： "犹12" → 犹大书 1:12
  //   分号分隔不同章/书，逗号分隔同章经节
  const parseReference = (ref: string): { bookId: number | null; chapter: number; endChapter: number; startVerse: number | null; endVerse: number | null } | null => {
    // 移除括号与书名号，统一空白
    let cleaned = ref.replace(/[《》【】\[\]()（）]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;

    // 照抄 bible-refs.ts：分号分割，每个片段独立解析
    const parts = cleaned.split(/[;；]/);
    const sorted = Object.keys(BOOK_NAME_MAP).sort((a, b) => b.length - a.length);
    let lastBookId = 0;
    const allResults: Array<{ bookId: number; chapter: number; endChapter: number; startVerse: number | null; endVerse: number | null }> = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // 提取书卷名
      let bookId = 0;
      let rest = '';

      for (let offset = 0; offset <= Math.min(trimmed.length, 20); offset++) {
        const sub = trimmed.slice(offset);
        for (const name of sorted) {
          if (sub.startsWith(name)) {
            const after = sub.slice(name.length).trim();
            if (/^[\d第章一二三四五六七八九十百]/.test(after) || after === '') {
              bookId = BOOK_NAME_MAP[name];
              rest = after;
              break;
            }
          }
        }
        if (bookId > 0) break;
      }

      if (bookId > 0) {
        lastBookId = bookId;
      } else if (lastBookId > 0) {
        bookId = lastBookId;
        rest = trimmed.replace(/[《》【】\[\]()（）]/g, '').trim();
      } else {
        continue;
      }

      // 将中文数字和 至/到 统一为阿拉伯数字和 -
      rest = normalizeCVStr(rest)
        .replace(/\s*[,，]\s*/g, ',')
        .trim();

      // 单章书卷：裸数字是节号而非章号
      if (SINGLE_CHAPTER_BOOKS.has(bookId) && /^\d/.test(rest) && !rest.includes(':') && !rest.includes('：')) {
        rest = '1:' + rest;
      }

      // 按空格分割，逐段解析
      const spaceParts = rest.split(/\s+/);
      let currentChapter = 0;
      let lastWasColon = false;

      for (const spacePart of spaceParts) {
        if (!spacePart) continue;
        const hasColonInPart = spacePart.includes(':') || spacePart.includes('：');
        const commaParts = spacePart.split(',');

        for (let i = 0; i < commaParts.length; i++) {
          const seg = commaParts[i];
          if (!seg) continue;
          const hasColon = seg.includes(':') || seg.includes('：');

          // 逗号后的裸数字视为当前章的节
          if (!hasColon && currentChapter > 0 && (hasColonInPart || lastWasColon)) {
            const rangeMatch = seg.match(/^(\d+)-(\d+)$/);
            if (rangeMatch) {
              allResults.push({ bookId, chapter: currentChapter, endChapter: currentChapter, startVerse: +rangeMatch[1], endVerse: +rangeMatch[2] });
              lastWasColon = true;
              continue;
            }
            const verseMatch = seg.match(/^(\d+)$/);
            if (verseMatch) {
              allResults.push({ bookId, chapter: currentChapter, endChapter: currentChapter, startVerse: +verseMatch[1], endVerse: +verseMatch[1] });
              lastWasColon = true;
              continue;
            }
          }

          let cv = parseChapterVerse(seg);
          if (cv) {
            currentChapter = cv.endChapter;
            allResults.push({ bookId, ...cv });
          }
          lastWasColon = hasColon;
        }
      }
    }

    if (allResults.length === 0) return null;

    // 合并所有结果：取最小章/节 和 最大章/节
    const first = allResults[0];
    const last = allResults[allResults.length - 1];
    return {
      bookId: lastBookId,
      chapter: first.chapter,
      endChapter: last.endChapter,
      startVerse: first.startVerse,
      endVerse: last.endVerse,
    };
  };

  // 照抄 bible-refs.ts 的 parseChapterVerse
  function parseChapterVerse(s: string): { chapter: number; endChapter: number; startVerse: number | null; endVerse: number | null } | null {
    // Normalize Chinese numerals and 至/到 first so all patterns below only handle Arabic digits
    const clean = normalizeCVStr(s.replace(/\s+/g, ' ').trim())

    // cross-chapter: "1:5-2:6" or "1：5-2：6"
    let m = clean.match(/^(\d+)\s*[:：]\s*(\d+)\s*[-–—]\s*(\d+)\s*[:：]\s*(\d+)$/)
    if (m) return { chapter: +m[1], endChapter: +m[3], startVerse: +m[2], endVerse: +m[4] }

    // same-chapter range: "14:7-9"
    m = clean.match(/^(\d+)\s*[:：]\s*(\d+)\s*[-–—]\s*(\d+)$/)
    if (m) return { chapter: +m[1], endChapter: +m[1], startVerse: +m[2], endVerse: +m[3] }

    // single verse: "14:7"
    m = clean.match(/^(\d+)\s*[:：]\s*(\d+)$/)
    if (m) return { chapter: +m[1], endChapter: +m[1], startVerse: +m[2], endVerse: +m[2] }

    // Chinese format: "第14章7-9节" or "14章7-9节"
    m = clean.match(/^第?\s*(\d+)\s*[章篇]\s*第?\s*(\d+)\s*[-–—]\s*(\d+)\s*节?$/)
    if (m) return { chapter: +m[1], endChapter: +m[1], startVerse: +m[2], endVerse: +m[3] }

    // Chinese format: "第14章第7节" or "14章7节"
    m = clean.match(/^第?\s*(\d+)\s*[章篇]\s*第?\s*(\d+)\s*节?$/)
    if (m) return { chapter: +m[1], endChapter: +m[1], startVerse: +m[2], endVerse: +m[2] }

    // Chinese format: "第14章" (whole chapter)
    m = clean.match(/^第?\s*(\d+)\s*[章篇]$/)
    if (m) return { chapter: +m[1], endChapter: +m[1], startVerse: null, endVerse: null }

    // chapter only: "14"
    m = clean.match(/^(\d+)$/)
    if (m) return { chapter: +m[1], endChapter: +m[1], startVerse: null, endVerse: null }

    return null
  }

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

        const { bookId, chapter: startChap, endChapter: endChap, startVerse: startV, endVerse: endV } = parsed;
        
        setChapter(startChap);
        setEndChapter(endChap);
        setBookName(BOOK_ID_TO_NAME[bookId] || '');

        const chapterRequests: Promise<BibleVerse[]>[] = [];
        for (let ch = startChap; ch <= endChap; ch++) {
          chapterRequests.push(getVerses(bookId, ch, version));
        }
        const chapterResults = await Promise.all(chapterRequests);
        const fetchedVerses = chapterResults.flat();
        setVerses(fetchedVerses);

        if (startV === null) {
          // 仅章节：展示整章
          const maxVerse = fetchedVerses
            .filter(v => v.ChapterSN === startChap)
            .reduce((max, v) => Math.max(max, v.VerseSN), 0);
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
      .filter(v => {
        if (chapter === endChapter) {
          return v.ChapterSN === chapter && v.VerseSN >= startVerse && v.VerseSN <= endVerse;
        }
        if (v.ChapterSN === chapter) {
          return v.VerseSN >= startVerse;
        }
        if (v.ChapterSN === endChapter) {
          return v.VerseSN <= endVerse;
        }
        return v.ChapterSN > chapter && v.ChapterSN < endChapter;
      })
      .map(v => {
        const parsed = parseVerseLection(v.Lection);
        const verseHeader = `【${bookName} ${v.ChapterSN}:${v.VerseSN}】`;
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

  const displayVerses = verses.filter(v => {
    if (chapter === endChapter) {
      return v.ChapterSN === chapter && v.VerseSN >= startVerse && v.VerseSN <= endVerse;
    }
    if (v.ChapterSN === chapter) {
      return v.VerseSN >= startVerse;
    }
    if (v.ChapterSN === endChapter) {
      return v.VerseSN <= endVerse;
    }
    return v.ChapterSN > chapter && v.ChapterSN < endChapter;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 px-0 md:px-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#252018] rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-[720px] md:max-w-3xl h-[70vh] overflow-hidden flex flex-col mb-0 md:mb-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2 border-b border-border dark:border-[#4a3f30]">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary dark:text-[#f5ece0] break-words">
            {chapter === endChapter
              ? `${bookName} ${chapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ''}`
              : `${bookName} ${chapter}:${startVerse}-${endChapter}:${endVerse}`}
          </h2>
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFontSizePicker(prev => !prev)}
              className={`p-1.5 rounded-lg border transition-colors ${showFontSizePicker ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-600' : 'bg-white dark:bg-[#252018] border-border dark:border-[#4a3f30] text-text-secondary dark:text-[#d4c4b0]'}`}
              title="字体大小"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
            </button>
            <select
              value={version}
              onChange={(e) => {
                setShowFontSizePicker(false);
                onVersionChange?.(e.target.value as BibleVersion);
              }}
              className="text-sm border border-border dark:border-[#4a3f30] rounded-lg px-2 py-1 bg-white dark:bg-[#252018] text-text-secondary dark:text-[#d4c4b0]"
            >
              <option value="cuv">和合本</option>
              <option value="bilingual">中英对照</option>
              <option value="asv">美标本</option>
              {isAdmin && <option value="ncv">新译本</option>}
            </select>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-warm-100 dark:hover:bg-[#352c20] rounded-lg transition-colors"
            >
              <X size={20} className="text-text-muted dark:text-text-muted" />
            </button>
          </div>
        </div>

        {showFontSizePicker && (
          <div className="px-4 py-2 border-b border-border dark:border-[#4a3f30] bg-warm-50 dark:bg-[#252018]/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary dark:text-[#d4c4b0]">字体大小</span>
              <span className="text-sm text-text-muted dark:text-text-secondary">{(fontSizeScale * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeFontSize(-0.1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-warm-200 dark:bg-[#4a3f30] text-text-primary dark:text-[#f5ece0] font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" y1="20" x2="15" y2="20"></line>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
                <span className="text-xs">A-</span>
              </button>
              <span className="text-text-primary dark:text-[#f5ece0] font-semibold" style={{ fontSize: `${verseFontSize}px` }}>
                预览经文
              </span>
              <button
                onClick={() => changeFontSize(0.1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-warm-200 dark:bg-[#4a3f30] text-text-primary dark:text-[#f5ece0] font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" y1="20" x2="15" y2="20"></line>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
                <span className="text-xs">A+</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : displayVerses.length === 0 ? (
            <p className="text-text-muted dark:text-text-muted">未找到经文</p>
          ) : (
            <div className="space-y-3">
              {displayVerses.map((verse) => (
                <div key={verse.VerseSN} className="flex gap-3 items-start">
                  <span
                    className="text-primary-600 dark:text-primary-400 font-semibold flex-shrink-0 text-right"
                    style={{
                      fontSize: `${verseFontSize}px`,
                      lineHeight: `${verseLineHeight}px`,
                      width: chapter === endChapter ? '2rem' : '4rem',
                    }}
                  >
                    {chapter === endChapter ? verse.VerseSN : `${verse.ChapterSN}:${verse.VerseSN}`}
                  </span>
                  <div
                    className="text-text-secondary dark:text-[#d4c4b0] flex-1"
                    style={{
                      fontSize: `${verseFontSize}px`,
                      lineHeight: `${verseLineHeight}px`,
                    }}
                  >
                    {(() => {
                      const parsed = parseVerseLection(verse.Lection);
                      return parsed.hasBilingual ? (
                        <>
                          <p>{parsed.chinese}</p>
                          <p style={{ 
                            fontStyle: 'italic',
                            color: 'rgb(107, 114, 128)',
                            marginTop: '0.25rem',
                            fontSize: `${englishFontSize}px`,
                            lineHeight: `${englishLineHeight}px`,
                          }} className="dark:text-text-muted">
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
          <div className="px-4 py-1.5 border-t border-border dark:border-[#4a3f30] bg-warm-50 dark:bg-[#252018]/50 flex justify-end">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
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
