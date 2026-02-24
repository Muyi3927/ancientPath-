import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BlogPost, Category } from '../types';
import { AuthContext } from '../App';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { ArrowLeft, Calendar, Share2, Tag, Type, Volume2, Edit, Gauge, Trash2, List, X, FileDown, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

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
  // Default to 1.2 for better readability
  const [fontSizeScale, setFontSizeScale] = useState(1.2);

  // Helpers
  const decreaseFont = () => setFontSizeScale(s => Math.max(0.8, Math.round((s - 0.1) * 10) / 10));
  const increaseFont = () => setFontSizeScale(s => Math.min(2.0, Math.round((s + 0.1) * 10) / 10));

  // TOC State
  const [showTOC, setShowTOC] = useState(false);
  const [headings, setHeadings] = useState<{id: string, text: string, level: number}[]>([]);
  const [tocMaxLevel, setTocMaxLevel] = useState(3);
  const [currentHeadingId, setCurrentHeadingId] = useState<string>('');
  const tocContainerRef = useRef<HTMLDivElement>(null);

  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageScale, setImageScale] = useState(1);

  useEffect(() => {
    if (post) {
      const timer = setTimeout(() => {
        const elements = document.querySelectorAll('.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6');
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

  // Track current heading on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (headings.length === 0) return;
      
      const scrollPosition = window.scrollY + 100;
      
      // Find current heading
      let currentId = '';
      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          currentId = headings[i].id;
          break;
        }
      }
      
      setCurrentHeadingId(currentId);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // Scroll TOC to current heading when level changes
  useEffect(() => {
    if (showTOC && currentHeadingId && tocContainerRef.current) {
      const currentButton = tocContainerRef.current.querySelector(`[data-heading-id="${currentHeadingId}"]`);
      if (currentButton) {
        currentButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [showTOC, tocMaxLevel, currentHeadingId]);

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

  const handleDelete = async () => {
      if (post && await onDeletePost(post.id)) {
          navigate('/');
      }
  };

  // 后端现在保证返回字符串 ID，所以我们可以使用严格相等。
  // 但为了保险起见，或者如果 categories 还没加载完，我们做个防御性检查。
  const categoryName = categories?.find(c => String(c.id) === String(post.categoryId))?.name || '未分类';
  
  const handleImageClick = (src: string) => {
    setPreviewImage(src);
    setImageRotation(0);
    setImageScale(1);
  };

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
                    const originalBody = document.body.className;
                    
                    // 设置文档标题
                    document.title = `访问古道_${post.title}`;
                    
                    // 确保打印样式正确应用
                    document.body.className = originalBody + ' print-mode';
                    
                    // 延迟执行打印以确保样式生效
                    setTimeout(() => {
                        window.print();
                        
                        // 恢复原始状态
                        setTimeout(() => {
                            document.title = originalTitle;
                            document.body.className = originalBody;
                        }, 100);
                    }, 100);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
                title="导出为 PDF"
            >
                <FileDown className="w-4 h-4" />
                <span>导出 PDF</span>
            </button>

          <div className="flex items-center bg-white dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="px-3 flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:flex">
                <Type className="w-3 h-3" /> 字体
             </div>
             <button 
                onClick={decreaseFont} 
                className="p-2 w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full active:bg-slate-200 transition-colors"
                title="减小字体"
             >
                <span className="font-bold text-sm">A-</span>
             </button>
             <span className="text-xs font-mono w-12 text-center">{(fontSizeScale * 100).toFixed(0)}%</span>
             <button 
                onClick={increaseFont} 
                className="p-2 w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full active:bg-slate-200 transition-colors"
                title="增大字体"
             >
                <span className="font-bold text-lg">A+</span>
             </button>
          </div>
          </div>
      </div>

      <article className="bg-white dark:bg-slate-900 md:rounded-3xl overflow-hidden shadow-none md:shadow-xl border-y md:border border-slate-100 dark:border-slate-800 -mx-4 md:mx-0">
        {/* Cover Image */}
        <div className="h-64 md:h-96 w-full relative print:hidden">
           <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
           <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white w-full">
              <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4 mb-4 text-sm text-slate-300">
                     <span className="bg-primary-600 px-2 py-0.5 rounded text-white text-xs font-bold">{categoryName}</span>
                     <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(post.createdAt, 'yyyy年M月d日')}</span>
                  </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight shadow-sm">{post.title}</h1>
           </div>
        </div>

        <div className="p-6 md:p-12">
          {/* 打印时显示的标题和信息 */}
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-serif font-bold text-black mb-2">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>分类：{categoryName}</span>
              <span>发布时间：{format(post.createdAt, 'yyyy年M月d日')}</span>
            </div>
            <div className="border-b border-gray-300 pb-4 mb-6">
              <div className="flex gap-2 flex-wrap">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100 dark:border-slate-800 print:hidden">
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
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <Volume2 className="w-5 h-5" /> 
                            <span>收听音频</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-7 line-clamp-1">{post.title}</span>
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
            className={`max-w-none font-serif text-slate-700 dark:text-slate-300 transition-all duration-200`} 
            style={{ 
              fontSize: `${fontSizeScale}rem`,
              lineHeight: '1.8',
              letterSpacing: '0.025em',
              wordSpacing: '0.05em'
            }}
            onImageClick={handleImageClick}
          />

        </div>
      </article>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
        >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-20" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Image Container */}
            <div 
                className="flex-1 flex items-center justify-center w-full h-full p-4 pt-16 pb-28 overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  // Close if clicking the background area (not the image itself)
                  if (e.target === e.currentTarget) {
                    setPreviewImage(null);
                  }
                }}
            >
                <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out shadow-2xl"
                    style={{ 
                        transform: `rotate(${imageRotation}deg) scale(${imageScale})`,
                        cursor: 'grab'
                    }}
                />
            </div>

            {/* Bottom Controls */}
            <div 
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 z-20"
                onClick={e => e.stopPropagation()}
            >
                <button 
                  onClick={() => setImageRotation(r => r - 90)} 
                  className="text-white/80 hover:text-white transition-colors p-2"
                  title="向左旋转"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setImageScale(s => Math.max(0.5, s - 0.25))} 
                  className="text-white/80 hover:text-white transition-colors p-2"
                  title="缩小"
                >
                    <ZoomOut className="w-6 h-6" />
                </button>
                
                <span className="text-white/50 text-xs font-mono w-12 text-center">{(imageScale * 100).toFixed(0)}%</span>

                <button 
                  onClick={() => setImageScale(s => Math.min(3, s + 0.25))} 
                  className="text-white/80 hover:text-white transition-colors p-2"
                  title="放大"
                >
                    <ZoomIn className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setImageRotation(r => r + 90)} 
                  className="text-white/80 hover:text-white transition-colors p-2"
                  title="向右旋转"
                >
                    <RotateCw className="w-6 h-6" />
                </button>
            </div>
        </div>
      )}

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
            className="w-full md:w-96 h-[70vh] md:h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white">目录</h3>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setTocMaxLevel(2)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      tocMaxLevel === 2
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    简
                  </button>
                  <button
                    onClick={() => setTocMaxLevel(3)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      tocMaxLevel === 3
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    中
                  </button>
                  <button
                    onClick={() => setTocMaxLevel(6)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      tocMaxLevel === 6
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    详
                  </button>
                </div>
              </div>
              <button onClick={() => setShowTOC(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* TOC Content */}
            <nav ref={tocContainerRef} className="flex-1 overflow-y-auto px-6 pt-4" style={{ paddingBottom: '4rem' }}>
              <div className="space-y-1">
                {headings.filter(h => h.level <= tocMaxLevel).map((h, i) => {
                  // Simple highlight logic: check if this heading is the current one or contains it
                  let isHighlighted = false;
                  
                  if (currentHeadingId) {
                    const currentIndex = headings.findIndex(hd => hd.id === currentHeadingId);
                    const thisIndex = headings.findIndex(hd => hd.id === h.id);
                    
                    if (currentIndex >= 0 && thisIndex >= 0 && thisIndex <= currentIndex) {
                      // This heading is before or at current position
                      // Check if the next heading of same or higher level is after current position
                      let nextSameLevelIndex = headings.findIndex((hd, idx) => 
                        idx > thisIndex && hd.level <= h.level
                      );
                      
                      // This heading contains current position
                      const containsCurrent = (nextSameLevelIndex === -1 || nextSameLevelIndex > currentIndex);
                      
                      if (containsCurrent) {
                        // Check if there's a higher-level (lower number) heading in filtered list that also contains current
                        const filteredHeadings = headings.filter(hd => hd.level <= tocMaxLevel);
                        const hasHigherLevelInFiltered = filteredHeadings.some((other) => {
                          if (other.level >= h.level) return false;
                          
                          const otherIndex = headings.findIndex(hd => hd.id === other.id);
                          if (otherIndex > currentIndex || otherIndex > thisIndex) return false;
                          
                          // Check if other heading contains current position
                          let nextOtherSameLevelIndex = headings.findIndex((hd, idx) => 
                            idx > otherIndex && hd.level <= other.level
                          );
                          
                          return (nextOtherSameLevelIndex === -1 || nextOtherSameLevelIndex > currentIndex);
                        });
                        
                        isHighlighted = !hasHigherLevelInFiltered;
                      }
                    }
                  }

                  let indentClass = '';
                  if (h.level === 1) indentClass = 'pl-0';
                  else if (h.level === 2) indentClass = 'pl-4';
                  else if (h.level === 3) indentClass = 'pl-8';
                  else if (h.level === 4) indentClass = 'pl-12';
                  else if (h.level >= 5) indentClass = 'pl-16';

                  return (
                    <button 
                      key={i}
                      data-heading-id={h.id}
                      onClick={() => {
                        const element = document.getElementById(h.id);
                        if (element) {
                          setShowTOC(false);
                          setTimeout(() => {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        } else {
                          console.log('Element not found:', h.id);
                        }
                      }}
                      className={`block w-full text-left py-2.5 px-3 rounded-lg text-sm transition-all ${
                        indentClass
                      } ${
                        isHighlighted
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold border-l-4 border-blue-600 dark:border-blue-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
                      }`}
                    >
                      {h.text}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};