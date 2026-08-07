import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';

// PDF 嵌入组件：桌面端内嵌，移动端显示按钮卡片
const PdfEmbed: React.FC<{ src: string }> = ({ src }) => {
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    return (
      <div className="not-prose my-4 flex gap-3">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-full text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors no-underline"
        >
          在浏览器中打开
        </a>
        <a
          href={src}
          download
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-full text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors no-underline"
        >
          下载 PDF
        </a>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900/50 print:hidden">
      <embed
        src={src}
        type="application/pdf"
        className="w-full min-h-[680px] border-0"
      />
      <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
        <span>无法显示？</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline font-medium">直接打开</a>
        <a href={src} download className="text-slate-500 underline">下载</a>
      </div>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  onImageClick?: (src: string) => void;
  onBibleVerseClick?: (reference: string) => void;
}

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
  '亚', '撒迦', '撒迦利亚书', '玛', '玛拉基书', 
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

// 识别经文引用的正则表达式
// 格式：[符号]书卷名[符号]第?章号[章]?[中上下]?第?[:：]?节号[-节号]?[节]?[，,...]
// 支持：章后紧跟“中/上/下”等字，支持“章 9 节”无冒号
// 注意：只匹配水平空白（空格、制表符），避免跨越换行
const BIBLE_REFERENCE_REGEX = new RegExp(
  `[《【（]?([A-Za-z\\u4e00-\\u9fa5]+?)(?=[》】）]?[ \\t\\u3000]*第?[ \\t\\u3000]*${BIBLE_CHAPTER_TOKEN}[ \\t\\u3000]*[章篇]?)[》】）]?[ \\t\\u3000]*第?[ \\t\\u3000]*(${BIBLE_CHAPTER_TOKEN})[ \\t\\u3000]*[章篇]?(?:[ \\t\\u3000]*第?[ \\t\\u3000]*(?:[:：][ \\t\\u3000]*|[ \\t\\u3000]+)?(${BIBLE_VERSE_TOKEN})[ \\t\\u3000]*[节]?)?(?:[ \\t\\u3000]*[，,;；][ \\t\\u3000]*(?:第?[ \\t\\u3000]*${BIBLE_CHAPTER_TOKEN}[ \\t\\u3000]*[章篇]?[ \\t\\u3000]*)?(?:[:：][ \\t\\u3000]*|[ \\t\\u3000]+)?${BIBLE_VERSE_TOKEN})*[ \\t\\u3000]*[》】）]?`,
  'g'
);

// 避免 HTML 块标签和后续文本粘连，导致 markdown 链接被当作普通文本
const DIV_CLOSE_WITHOUT_NEWLINE_REGEX = /(<\/div\s*>)([^\s<])/gi;
const DIV_CLOSE_SINGLE_NEWLINE_REGEX = /(<\/div\s*>)[ \t]*\n(?![ \t]*\n)/gi;

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', style, onImageClick, onBibleVerseClick }) => {
  const isSafeMediaUrl = (url: string) => /^(https?:\/\/|\/)/i.test(url);

  const isPdfUrl = (url: string) => /\.pdf(?:$|[?#])/i.test(url);

  // 预处理内容：将经文引用替换为 markdown 链接
  const processedContent = useCallback(() => {
    // 先修复 </div> 后的正文衔接：无换行或仅单换行都补成空行，确保退出 HTML block
    const normalizedContent = content
      .replace(DIV_CLOSE_WITHOUT_NEWLINE_REGEX, '$1\n\n$2')
      .replace(DIV_CLOSE_SINGLE_NEWLINE_REGEX, '$1\n\n');
    // 先处理经文引用（避免双空格规范化将经文引用内的空格替换为换行）
    const bibleProcessed = normalizedContent.replace(BIBLE_REFERENCE_REGEX, (match, book, chapter, versePart) => {
      let normalizedBook = String(book || '').trim();
      const normalizedChapter = normalizeBibleNumberToken(String(chapter || ''));
      
      // 验证书卷名是否有效，如果不有效则尝试从左截取找有效后缀
      // 例如"参看罗马书"中，贪婪匹配会捕获"参看罗马书"，需要找到"罗马书"
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
      const linkedParts = parts.map((part) => {
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
            return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
          } else {
            const normalizedRef = `${normalizedBook}${normalizedChapter}`
              .replace(/：/g, ':');
            return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
          }
        }

        const isComma = lastSeparator === ',' || lastSeparator === '，';

        // 逗号后的裸数字或数字范围（如 14 或 14-15）→ 同章的节号
        if (isComma && BARE_VERSE_RANGE_RE.test(trimmed)) {
          const segVersePart = normalizeVersePart(trimmed);
          if (!segVersePart) return part;
          const normalizedRef = `${normalizedBook}${currentChapter}:${segVersePart}`.replace(/：/g, ':');
          return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
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
        return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
      });

      const linkedText = linkedParts.join('');
      const result = hasBrackets && bracketMatch ? `${bracketMatch[1]}${linkedText}${bracketMatch[3]}` : linkedText;
      return bookPrefix + result;
    });
    // 经文处理完毕后再做双空格规范化
    return bibleProcessed.replace(/([^\s])([ \t\u3000]{2,})([^\s])/g, '$1  \n$3');
  }, [content]);
  return (
    <div 
      className={`prose dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:font-serif prose-a:text-primary-600 print:max-w-none print:prose-headings:text-black print:prose-p:text-black print:prose-li:text-black print:prose-a:text-primary-600 print:prose-blockquote:text-text-secondary ${className}`} 
      style={{
        ...style,
        wordSpacing: '0.05em',
        letterSpacing: '0.025em',
        fontKerning: 'normal',
        fontVariantLigatures: 'normal',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
            a: ({node, ...props}) => {
              const href = props.href || '';
              // 检查是否是经文链接
              if (href.startsWith('#bible:')) {
                const reference = decodeURIComponent(href.replace('#bible:', ''));
                return (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onBibleVerseClick?.(reference);
                    }}
                    className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer font-medium"
                  >
                    {props.children}
                  </button>
                );
              }
              // 普通链接
              return (
                <a {...props} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {props.children}
                </a>
              );
            },
            img: ({node, ...props}) => (
                <img 
                    {...props} 
                    onClick={() => onImageClick && props.src && onImageClick(props.src)} 
                    className={`${props.className || ''} ${onImageClick ? 'cursor-zoom-in hover:opacity-95 transition-opacity print:cursor-default' : ''} print:break-inside-avoid print:page-break-inside-avoid`}
                    loading="lazy"
                />
            ),
            h1: ({children, ...props}) => (
                <h1 {...props} className="print:break-after-avoid print:page-break-after-avoid">
                    {children}
                </h1>
            ),
            h2: ({children, ...props}) => (
                <h2 {...props} className="print:break-after-avoid print:page-break-after-avoid">
                    {children}
                </h2>
            ),
            h3: ({children, ...props}) => (
                <h3 {...props} className="print:break-after-avoid print:page-break-after-avoid">
                    {children}
                </h3>
            ),
            blockquote: ({children, ...props}) => (
                <blockquote {...props} className="print:break-inside-avoid print:page-break-inside-avoid">
                    {children}
                </blockquote>
            ),
            pre: ({children, ...props}) => (
                <pre {...props} className="print:break-inside-avoid print:page-break-inside-avoid">
                    {children}
                </pre>
            ),
            table: ({children, ...props}) => (
                <table {...props} className="print:break-inside-avoid print:page-break-inside-avoid">
                    {children}
                </table>
            ),
            iframe: ({node, ...props}) => {
                const src = typeof props.src === 'string' ? props.src : '';
                if (!src || !isSafeMediaUrl(src)) {
                  return null;
                }

                if (isPdfUrl(src)) {
                  return <PdfEmbed src={src} />;
                }

                return (
                  <div className="my-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    <iframe
                      {...props}
                      src={src}
                      loading={props.loading || 'lazy'}
                      className="min-h-[360px] w-full border-0 print:hidden"
                    />
                    <div className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
                      <a href={src} target="_blank" rel="noopener noreferrer" className="underline">打开内容</a>
                    </div>
                  </div>
                );
            },
            embed: ({node, ...props}) => {
                const src = typeof props.src === 'string' ? props.src : '';
                if (!src || !isSafeMediaUrl(src)) return null;
                if (isPdfUrl(src) || (typeof props.type === 'string' && props.type.includes('pdf'))) {
                  return <PdfEmbed src={src} />;
                }
                return null;
            },
            object: ({node, ...props}) => {
                const data = typeof props.data === 'string' ? props.data : '';
                if (!data || !isSafeMediaUrl(data)) {
                  return null;
                }

                const pdfLike = isPdfUrl(data);
                return (
                  <div className="my-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    <object
                      {...props}
                      data={data}
                      className={`${pdfLike ? 'min-h-[520px]' : 'min-h-[360px]'} w-full print:hidden`}
                    />
                    <div className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
                      <a href={data} target="_blank" rel="noopener noreferrer" className="underline">
                        打开{pdfLike ? 'PDF' : '内容'}
                      </a>
                    </div>
                  </div>
                );
            }
        }}
      >
        {processedContent()}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;