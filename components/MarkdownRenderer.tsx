import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  onImageClick?: (src: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', style, onImageClick }) => {
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
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;