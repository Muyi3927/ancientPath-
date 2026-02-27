import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';

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
  '玛', '玛拉基书', '撒迦', '撒迦利亚书'
]);

// 识别经文引用的正则表达式
// 格式：[符号]书卷名[符号]第?章号[章]?第?[:：]?节号[-节号]?[节]?[，,...]
// 支持：章后紧跟“中/上/下”等字，支持“章 9 节”无冒号
// 注意：只匹配水平空白（空格、制表符），避免跨越换行
const BIBLE_REFERENCE_REGEX = /[《【（]?([A-Za-z\u4e00-\u9fa5]+)[》】）]?[ \t\u3000]*第?[ \t\u3000]*(\d{1,3})(?:[章]?[ \t\u3000]*(?:中|上|下)?[ \t\u3000]*第?[ \t\u3000]*(?:[:：][ \t\u3000]*|[ \t\u3000]+)?(\d{1,3}(?:[ \t\u3000]*-[ \t\u3000]*\d{1,3})?)[ \t\u3000]*[节]?)?(?:[ \t\u3000]*[，,][ \t\u3000]*(?:第?[ \t\u3000]*\d{1,3}[ \t\u3000]*[章]?[ \t\u3000]*)?(?:[:：][ \t\u3000]*|[ \t\u3000]+)?\d{1,3}(?:[ \t\u3000]*-[ \t\u3000]*\d{1,3})?)*[ \t\u3000]*[》】）]?/g;

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', style, onImageClick, onBibleVerseClick }) => {
  // 预处理内容：将经文引用替换为 markdown 链接
  const processedContent = useCallback(() => {
    const normalizedContent = content.replace(/([^\s])([ \t\u3000]{2,})([^\s])/g, '$1  \n$3');
    return normalizedContent.replace(BIBLE_REFERENCE_REGEX, (match, book, chapter, versePart) => {
      const normalizedBook = String(book || '').trim();
      const normalizedChapter = String(chapter || '').trim();
      
      // 验证书卷名是否有效
      if (!normalizedBook || !normalizedChapter || !VALID_BOOK_NAMES.has(normalizedBook)) {
        return match;
      }

      const trimmedMatch = match.trim();
      const bracketMatch = trimmedMatch.match(/^([《【（])([\s\S]*)([》】）])$/);
      const hasBrackets = !!bracketMatch;
      const innerText = hasBrackets && bracketMatch ? bracketMatch[2].trim() : trimmedMatch;

      // 拆分同卷多个引用，保留分隔符
      const parts = innerText.split(/([，,])/);

      let firstSegmentHandled = false;
      const linkedParts = parts.map((part) => {
        const trimmed = part.trim();
        if (!trimmed || trimmed === '，' || trimmed === ',') {
          return part;
        }

        if (!firstSegmentHandled) {
          firstSegmentHandled = true;
          if (versePart) {
            const cleanedVersePart = String(versePart).replace(/[ \t\u3000]+/g, '');
            const normalizedRef = `${normalizedBook}${normalizedChapter}:${cleanedVersePart}`
              .replace(/：/g, ':');
            return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
          } else {
            // 没有节号，只有章号，创建链接为"书卷章"
            const normalizedRef = `${normalizedBook}${normalizedChapter}`
              .replace(/：/g, ':');
            return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
          }
        }

        const segmentMatch = trimmed.match(/^(?:第?[ \t\u3000]*(\d{1,3})[ \t\u3000]*[章]?[ \t\u3000]*(?:中|上|下)?[ \t\u3000]*)?(?:[:：][ \t\u3000]*|[ \t\u3000]+)?(\d{1,3}(?:[ \t\u3000]*-[ \t\u3000]*\d{1,3})?)?\s*[节]?$/);
        if (!segmentMatch) {
          return part;
        }

        const segChapter = (segmentMatch[1] || normalizedChapter).trim();
        const segVersePart = segmentMatch[2] ? segmentMatch[2].replace(/[ \t\u3000]+/g, '') : '';
        const normalizedRef = segVersePart
          ? `${normalizedBook}${segChapter}:${segVersePart}`.replace(/：/g, ':')
          : `${normalizedBook}${segChapter}`.replace(/：/g, ':');
        return `[${part}](#bible:${encodeURIComponent(normalizedRef)})`;
      });

      const linkedText = linkedParts.join('');
      return hasBrackets && bracketMatch ? `${bracketMatch[1]}${linkedText}${bracketMatch[3]}` : linkedText;
    });
  }, [content]);
  return (
    <div 
      className={`prose dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:font-serif prose-a:text-primary-600 print:max-w-none print:prose-headings:text-black print:prose-p:text-black print:prose-li:text-black print:prose-a:text-blue-600 print:prose-blockquote:text-gray-600 ${className}`} 
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
                    className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
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
            )
        }}
      >
        {processedContent()}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;