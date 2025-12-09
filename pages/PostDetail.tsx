import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BlogPost, Category } from '../types';
import { AuthContext } from '../App';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { ArrowLeft, Calendar, User, Share2, Tag, Type, Minus, Plus, Volume2, Edit, Gauge, Trash2, List, X, FileDown } from 'lucide-react';

interface PostDetailProps {
  posts: BlogPost[];
  updatePost: (updatedPost: BlogPost) => void;
  onDeletePost: (id: number) => Promise<boolean | undefined>;
  categories?: Category[];
}

export const PostDetail: React.FC<PostDetailProps> = ({ posts, updatePost, onDeletePost, categories }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [post, setPost] = useState<BlogPost | null>(null);
  
  // Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Accessibility: Font Size State
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const fontClasses = ['prose-lg', 'prose-xl', 'prose-2xl'];

  // TOC State
  const [showTOC, setShowTOC] = useState(false);
  const [headings, setHeadings] = useState<{id: string, text: string, level: number}[]>([]);

  useEffect(() => {
    if (post) {
      const timer = setTimeout(() => {
        const elements = document.querySelectorAll('.prose h1, .prose h2, .prose h3');
        const h = Array.from(elements).map(el => ({
          id: el.id,
          text: el.textContent || '',
          level: parseInt(el.tagName.substring(1))
        }));
        setHeadings(h);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [post]);

  useEffect(() => {
    // --- 修复: 使用非严格相等 (==) 来比较数字 ID 和 URL 中的字符串 ID ---
    // 因为后端现在返回数字 ID，而 URL 参数总是字符串
    const found = posts.find(p => String(p.id) === id); 
    if (found) {
      setPost(found);
    } else {
      // 如果没找到，可能是因为 posts 数组还没更新。
      // 更健壮的方案是直接从 API 获取文章。
      // 目前我们先跳转回首页。
      navigate('/');
    }
  }, [id, posts, navigate]);

  if (!post) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div></div>;

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert("链接已复制到剪贴板！");
    }).catch(() => {
        alert("复制失败，请手动复制网址。");
    });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (audioRef.current) {
          audioRef.current.playbackRate = parseFloat(e.target.value);
      }
  };

  const increaseFont = () => setFontSizeLevel(prev => Math.min(prev + 1, 2));
  const decreaseFont = () => setFontSizeLevel(prev => Math.max(prev - 1, 0));

  const handleDelete = async () => {
      if (post && await onDeletePost(post.id)) {
          navigate('/');
      }
  };

  // 后端现在保证返回字符串 ID，所以我们可以使用严格相等。
  // 但为了保险起见，或者如果 categories 还没加载完，我们做个防御性检查。
  const categoryName = categories?.find(c => String(c.id) === String(post.categoryId))?.name || '未分类';
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center text-slate-500 hover:text-primary-600 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回列表
            </Link>
            {isAdmin && (
                <div className="flex gap-2">
                    <Link to={`/editor/${post.id}`} className="flex items-center text-primary-600 hover:text-primary-700 font-bold text-sm bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">
                        <Edit className="w-3 h-3 mr-1" /> 编辑文章
                    </Link>
                    <button onClick={handleDelete} className="flex items-center text-red-600 hover:text-red-700 font-bold text-sm bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">
                        <Trash2 className="w-3 h-3 mr-1" /> 删除文章
                    </button>
                </div>
            )}
          </div>

          {/* Accessibility & TOC Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <button 
                onClick={() => {
                    const originalTitle = document.title;
                    document.title = `访问古道_${post.title}`;
                    window.print();
                    document.title = originalTitle;
                }}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
                title="导出为 PDF"
            >
                <FileDown className="w-4 h-4" />
                <span>导出 PDF</span>
            </button>

          <div className="flex items-center bg-white dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="px-3 flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                <Type className="w-3 h-3" /> 字体
             </div>
             <button 
                onClick={decreaseFont} 
                disabled={fontSizeLevel === 0}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-30 transition-colors"
                title="减小字体"
             >
                <Minus className="w-4 h-4" />
             </button>
             <span className="text-xs font-mono w-4 text-center">{fontSizeLevel + 1}</span>
             <button 
                onClick={increaseFont} 
                disabled={fontSizeLevel === 2}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-30 transition-colors"
                title="增大字体"
             >
                <Plus className="w-4 h-4" />
             </button>
          </div>
          </div>
      </div>

      <article className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800">
        {/* Cover Image */}
        <div className="h-64 md:h-96 w-full relative">
           <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
           <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white w-full">
              <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4 mb-4 text-sm text-slate-300">
                     <span className="bg-primary-600 px-2 py-0.5 rounded text-white text-xs font-bold">{categoryName}</span>
                     <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(post.createdAt, 'yyyy年M月d日')}</span>
                     <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author.username}</span>
                  </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight shadow-sm">{post.title}</h1>
           </div>
        </div>

        <div className="p-6 md:p-12">
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
             <div className="flex gap-2 flex-wrap">
                {post.tags.map(tag => (
                   <Link 
                     key={tag} 
                     to={`/?tag=${tag}`}
                     className="text-xs font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 transition-colors flex items-center gap-1"
                   >
                     <Tag className="w-3 h-3" /> {tag}
                   </Link>
                ))}
             </div>
             <div className="flex gap-4 flex-shrink-0 print:hidden">
               <button onClick={handleShare} className="flex items-center gap-1 text-slate-500 hover:text-primary-600" title="分享">
                  <Share2 className="w-5 h-5" /> 分享
               </button>
             </div>
          </div>

          {/* Audio Player */}
          {post.audioUrl && (
              <div className="mb-10 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 print:hidden">
                  <div className="flex items-center justify-between mb-3 text-primary-600 font-bold">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5" /> 
                        <span>收听音频</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-slate-400"/>
                          <select 
                            onChange={handleSpeedChange} 
                            className="bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-500"
                            defaultValue="1"
                          >
                              <option value="0.75">0.75x</option>
                              <option value="1">1.0x</option>
                              <option value="1.25">1.25x</option>
                              <option value="1.5">1.5x</option>
                              <option value="2">2.0x</option>
                          </select>
                      </div>
                  </div>
                  <audio 
                      ref={audioRef}
                      controls 
                      className="w-full h-12 block"
                      src={post.audioUrl}
                  >
                      您的浏览器不支持音频播放。
                  </audio>
              </div>
          )}
            
          {/* Post Content with dynamic font size class */}
          <MarkdownRenderer 
            content={post.content} 
            className={`${fontClasses[fontSizeLevel]} max-w-none font-serif text-slate-700 dark:text-slate-300 leading-loose transition-all duration-200`} 
          />

        </div>
      </article>

      {/* Floating TOC Button */}
      {headings.length > 0 && (
        <button
          onClick={() => setShowTOC(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:text-primary-600 transition-all hover:scale-110"
          title="目录"
        >
          <List className="w-6 h-6" />
        </button>
      )}

      {/* TOC Overlay */}
      {showTOC && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:flex-row md:justify-end bg-black/20 backdrop-blur-sm" onClick={() => setShowTOC(false)}>
          <div 
            className="w-full md:w-80 h-[60vh] md:h-full bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white">目录</h3>
              <button onClick={() => setShowTOC(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <nav className="space-y-1">
              {headings.map((h, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    setShowTOC(false);
                    document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`block w-full text-left py-2 px-3 rounded-lg text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 ${h.level === 1 ? 'font-bold' : h.level === 2 ? 'pl-6' : 'pl-9 text-slate-500 dark:text-slate-400'}`}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};