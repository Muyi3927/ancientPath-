import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Pressable, Alert, TextInput } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getVerses, BibleVerse, BibleVersionKey, setActiveBibleVersion, getActiveBibleVersion, parseVerseLection } from '../services/BibleDatabase';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NCV_UNLOCK_KEY = 'ncv_unlocked';
const BIBLE_FONT_SIZE_SCALE_KEY = 'bible_font_size_scale';

interface BibleVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string; // e.g., "太3:16" or "路1:3-6"
  version?: BibleVersionKey;
  onVersionChange?: (version: BibleVersionKey) => void;
}

// 只有一章的书卷——裸数字视为节号而非章号
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

const BibleVerseModal = React.memo<BibleVerseModalProps>(({ 
  isOpen, 
  onClose, 
  reference,
  version = 'cuv',
  onVersionChange
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState(0);
  const [endChapter, setEndChapter] = useState(0);
  const [startVerse, setStartVerse] = useState(0);
  const [endVerse, setEndVerse] = useState(0);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState(1.1);
  const [ncvUnlocked, setNcvUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 加载新译本解锁状态
  useEffect(() => {
    AsyncStorage.getItem(NCV_UNLOCK_KEY).then(value => {
      setNcvUnlocked(value === 'true');
    });

    AsyncStorage.getItem(BIBLE_FONT_SIZE_SCALE_KEY).then(value => {
      if (!value) return;
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        setFontSizeScale(Math.max(0.8, Math.min(2.0, parsed)));
      }
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowFontSizePicker(false);
      setShowVersionPicker(false);
    }
  }, [isOpen]);

  const changeFontSize = useCallback((delta: number) => {
    setFontSizeScale(prev => {
      const next = Math.max(0.8, Math.min(2.0, Math.round((prev + delta) * 10) / 10));
      AsyncStorage.setItem(BIBLE_FONT_SIZE_SCALE_KEY, next.toString());
      return next;
    });
  }, []);

  const verseFontSize = Math.round(18 * fontSizeScale);
  const verseLineHeight = Math.round(28 * fontSizeScale);
  const englishFontSize = Math.max(14, Math.round(16 * fontSizeScale));
  const englishLineHeight = Math.round(26 * fontSizeScale);

  const availableVersions = useMemo(() => {
    const versions = [
      { key: 'cuv' as BibleVersionKey, label: '和合本' },
      { key: 'bilingual' as BibleVersionKey, label: '中英对照' },
      { key: 'asv' as BibleVersionKey, label: '美标本' },
    ];
    if (ncvUnlocked) {
      versions.push({ key: 'ncv' as BibleVersionKey, label: '新译本' });
    }
    return versions;
  }, [ncvUnlocked]);

  const handlePasswordSubmit = useCallback(async () => {
    if (passwordInput === '3927') {
      setNcvUnlocked(true);
      await AsyncStorage.setItem(NCV_UNLOCK_KEY, 'true');
      setShowPasswordModal(false);
      setPasswordInput('');
      Alert.alert('解锁成功', '新译本已启用');
    } else {
      Alert.alert('密码错误', '请输入正确的口令');
      setPasswordInput('');
    }
  }, [passwordInput]);

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
        
        if (!bookId) {
          setError('无法找到书卷');
          return;
        }
        
        setChapter(startChap);
        setEndChapter(endChap);
        setBookName(BOOK_ID_TO_NAME[bookId] || '');

        // 切换到正确的圣经版本
        await setActiveBibleVersion(version);
        
        const chapterRequests: Promise<BibleVerse[]>[] = [];
        for (let ch = startChap; ch <= endChap; ch++) {
          chapterRequests.push(getVerses(bookId, ch));
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

  const handleCopy = useCallback(async () => {
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
        if (parsed.hasBilingual) {
          return `【${bookName} ${v.ChapterSN}:${v.VerseSN}】\n${parsed.chinese}\n${parsed.english}`;
        }
        return `【${bookName} ${v.ChapterSN}:${v.VerseSN}】${parsed.chinese}`;
      })
      .join('\n');
    
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [verses, startVerse, endVerse, bookName, chapter]);

  const displayVerses = useMemo(() => 
    verses.filter(v => {
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
    }),
    [verses, chapter, endChapter, startVerse, endVerse]
  );

  const renderVerseItem = useCallback(({ item: verse }: { item: BibleVerse }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
      <Text style={{ 
        color: isDark ? '#60a5fa' : '#2563eb',
        fontWeight: '600',
        flexShrink: 0,
        fontSize: verseFontSize,
        lineHeight: verseLineHeight,
        width: chapter === endChapter ? 30 : 64,
        textAlign: 'right'
      }}
      numberOfLines={1}
      ellipsizeMode="clip"
      >
        {chapter === endChapter ? verse.VerseSN : `${verse.ChapterSN}:${verse.VerseSN}`}
      </Text>
      <View style={{ flex: 1 }}>
        {(() => {
          const parsed = parseVerseLection(verse.Lection);
          return (
            <>
              <Text style={{ 
                color: isDark ? '#d1d5db' : '#374151',
                lineHeight: verseLineHeight,
                fontSize: verseFontSize,
                marginBottom: parsed.hasBilingual ? 6 : 0,
              }}>
                {parsed.chinese}
              </Text>
              {parsed.hasBilingual && (
                <Text style={{ 
                  color: isDark ? '#9ca3af' : '#6b7280',
                  lineHeight: englishLineHeight,
                  fontSize: englishFontSize,
                  fontStyle: 'italic',
                }}>
                  {parsed.english}
                </Text>
              )}
            </>
          );
        })()}
      </View>
    </View>
  ), [isDark, chapter, endChapter, verseFontSize, verseLineHeight, englishFontSize, englishLineHeight]);

  if (!isOpen) return null;

  const currentVersionLabel = availableVersions.find(v => v.key === version)?.label || '和合本';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      hardwareAccelerated
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* 点击上方空白区域关闭 */}
        <TouchableOpacity 
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View 
          style={{
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            height: '70%',
            borderTopWidth: 2,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: isDark ? '#374151' : '#d1d5db',
          }}
        >
          {/* Header */}
          <View className={`flex-row items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {chapter === endChapter
                ? `${bookName} ${chapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ''}`
                : `${bookName} ${chapter}:${startVerse}-${endChapter}:${endVerse}`}
            </Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowVersionPicker(false);
                  setShowFontSizePicker(prev => !prev);
                }}
                className={`p-1.5 rounded-lg border ${showFontSizePicker ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700' : 'bg-white dark:bg-[#252018] border-border dark:border-[#4a3f30]'}`}
              >
                <IconSymbol name="textformat.size" size={16} color={showFontSizePicker ? (isDark ? '#f59e38' : '#e36208') : (isDark ? '#d4c4b0' : '#6d5c4a')} />
              </TouchableOpacity>

              {/* Version Picker */}
              <TouchableOpacity
                onPress={() => {
                  setShowFontSizePicker(false);
                  setShowVersionPicker(!showVersionPicker);
                }}
                className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg border ${showVersionPicker ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700' : 'bg-white dark:bg-[#252018] border-border dark:border-[#4a3f30]'}`}
              >
                <Text className={`text-sm ${showVersionPicker ? 'text-primary-600 dark:text-primary-400' : 'text-text-secondary dark:text-[#d4c4b0]'}`}>
                  {currentVersionLabel}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={showVersionPicker ? (isDark ? '#f59e38' : '#e36208') : (isDark ? '#d4c4b0' : '#6d5c4a')} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onClose}
                className="p-2 rounded-lg"
              >
                <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Font Size Picker */}
          {showFontSizePicker && (
            <View className="px-4 py-2 border-b border-border dark:border-[#4a3f30] bg-warm-50 dark:bg-[#252018]/60">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm text-text-secondary dark:text-[#d4c4b0]">字体大小</Text>
                <Text className="text-sm text-text-muted dark:text-[#a89880]">{(fontSizeScale * 100).toFixed(0)}%</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => changeFontSize(-0.1)}
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-warm-200 dark:bg-[#4a3f30]"
                >
                  <Text className="text-text-primary dark:text-[#f5ece0] text-xs font-semibold">A-</Text>
                </TouchableOpacity>

                <Text
                  style={{ fontSize: verseFontSize }}
                  className="text-text-primary dark:text-[#f5ece0] font-semibold"
                >
                  预览经文
                </Text>

                <TouchableOpacity
                  onPress={() => changeFontSize(0.1)}
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-warm-200 dark:bg-[#4a3f30]"
                >
                  <Text className="text-text-primary dark:text-[#f5ece0] text-xs font-semibold">A+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Version Picker Dropdown */}
          {showVersionPicker && (
            <View className="px-4 py-2 border-b border-border dark:border-[#4a3f30] bg-warm-50 dark:bg-[#252018]/60">
              {availableVersions.map((v) => (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => {
                    onVersionChange?.(v.key);
                    setShowVersionPicker(false);
                  }}
                  className={`py-2.5 px-4 rounded-xl mb-1 flex-row items-center justify-between ${version === v.key ? 'bg-primary-600' : 'bg-white dark:bg-[#1e1a14] border border-border dark:border-[#4a3f30]'}`}
                >
                  <Text className={`text-sm ${version === v.key ? 'text-white font-semibold' : 'text-text-primary dark:text-[#f5ece0]'}`}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {!ncvUnlocked && (
                <TouchableOpacity
                  onPress={() => {
                    setShowVersionPicker(false);
                    setShowPasswordModal(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-warm-100 dark:bg-[#252018] border border-border dark:border-[#4a3f30]"
                >
                  <Text className="text-sm text-text-muted dark:text-[#a89880]">
                    🔒 解锁新译本
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : error ? (
            <View className="flex-1 px-4 py-3">
              <Text className={isDark ? 'text-red-400' : 'text-red-600'}>{error}</Text>
            </View>
          ) : displayVerses.length === 0 ? (
            <View className="flex-1 px-4 py-3">
              <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>未找到经文</Text>
            </View>
          ) : (
            <FlatList
              data={displayVerses}
              keyExtractor={(item) => `${item.ID}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
              renderItem={renderVerseItem}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              windowSize={5}
              removeClippedSubviews={false}
            />
          )}

          {/* Footer */}
          {displayVerses.length > 0 && (
            <View className={`px-4 py-1.5 border-t ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'} flex-row justify-end`}>
              <TouchableOpacity 
                onPress={handleCopy}
                className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {copied ? (
                  <>
                    <IconSymbol name="checkmark" size={18} color="white" />
                    <Text className="text-white font-medium">已复制</Text>
                  </>
                ) : (
                  <>
                    <IconSymbol name="doc.on.doc" size={18} color="white" />
                    <Text className="text-white font-medium">复制经文</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Password Modal for NCV Unlock */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowPasswordModal(false)}
        >
          <Pressable 
            className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-80`}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              解锁新译本
            </Text>
            <Text className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              请输入口令以启用新译本（内测版）
            </Text>
            <TextInput
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="输入口令"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              secureTextEntry
              autoFocus
              onSubmitEditing={handlePasswordSubmit}
              className={`px-4 py-3 rounded-lg mb-4 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                className={`flex-1 py-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                <Text className={`text-center font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  取消
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePasswordSubmit}
                className="flex-1 py-3 rounded-lg bg-blue-600"
              >
                <Text className="text-center font-medium text-white">
                  确认
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
});

BibleVerseModal.displayName = 'BibleVerseModal';

export default BibleVerseModal;
