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
    <div className={`prose dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:font-serif prose-a:text-primary-600 ${className}`} style={style}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
            img: ({node, ...props}) => (
                <img 
                    {...props} 
                    onClick={() => onImageClick && props.src && onImageClick(props.src)} 
                    className={`${props.className || ''} ${onImageClick ? 'cursor-zoom-in hover:opacity-95 transition-opacity' : ''}`}
                    loading="lazy"
                />
            )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;