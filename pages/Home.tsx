import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { BlogPost, Category } from '../types';
import { Clock, Tag, ChevronRight, Filter, X, ChevronLeft, ChevronDown, Folder, FolderOpen, ChevronUp } from 'lucide-react';

interface HomeProps {
  posts: BlogPost[];
  categories: Category[];
}

const ITEMS_PER_PAGE = 5;

export const Home: React.FC<HomeProps> = ({ posts, categories }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFilter = searchParams.get('category');
  const tagFilter = searchParams.get('tag');
  const searchQuery = searchParams.get('search');
  
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false); // 移动端默认关闭分类菜单

  // 轮播图状态
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const categoryIdNum = categoryIdFilter ? parseInt(categoryIdFilter, 10) : null;
    if (categoryIdNum) {
        setActiveCategoryId(categoryIdNum);
        // 如果选中的是子分类，自动展开父分类
        const cat = categories.find((c) => c.id === categoryIdNum);
        if (cat && cat.parentId) {
            setExpandedCategories(prev => new Set(prev).add(cat.parentId!));
        }
        setIsMobileCategoryOpen(true); // 如果有筛选，自动打开移动端菜单
    } else {
        setActiveCategoryId(null);
    }
    setCurrentPage(1); // 筛选改变时重置页码
  }, [categoryIdFilter, categories]);

  // 切换分类展开/折叠
  const toggleExpand = (id: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newSet = new Set(expandedCategories);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedCategories(newSet);
  };

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name || '未知分类';

  // 递归获取所有子分类 ID (Memoized to avoid recalculation on every render)
  const getDescendantIds = useMemo(() => {
      return (rootId: number): number[] => {
          const children = categories.filter(c => c.parentId == rootId); // Use == for loose comparison
          let ids = children.map(c => c.id);
          children.forEach(child => {
              ids = [...ids, ...getDescendantIds(child.id)];
          });
          return ids;
      };
  }, [categories]);

  // 计算分类文章数量 (包含子分类，递归)
  const getCategoryCount = (catId: number) => {
      const targetIds = new Set([catId, ...getDescendantIds(catId)]);
      
      return posts.filter(p => {
          const pCatId = Number(p.categoryId);
          return targetIds.has(pCatId);
      }).length;
  };

  // 计算标签权重
  const tagCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      posts.forEach(p => p.tags.forEach(t => counts[t] = (counts[t] || 0) + 1));
      return counts;
  }, [posts]);

  const getTagSizeClass = (count: number) => {
      if (count >= 10) return 'text-lg font-bold';
      if (count >= 5) return 'text-base font-medium';
      return 'text-xs';
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // 分类逻辑：包含精确匹配 OR 如果文章分类是选中分类的子分类 (递归)
      let matchesCategory = true;
      if (activeCategoryId !== null) {
        const targetIds = new Set([activeCategoryId, ...getDescendantIds(activeCategoryId)]);
        matchesCategory = targetIds.has(Number(post.categoryId));
      }

      const matchesTag = tagFilter ? post.tags.includes(tagFilter) : true;
      const matchesSearch = searchQuery 
        ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesCategory && matchesSearch && matchesTag;
    });
  }, [posts, activeCategoryId, searchQuery, tagFilter, categories]);

  // 分页逻辑
  const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const featuredPosts = useMemo(() => posts.filter((p) => p.isFeatured), [posts]);

  // 轮播图自动播放
  useEffect(() => {
    if (featuredPosts.length <= 1) return;
    const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % featuredPosts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredPosts.length]);

  const nextSlide = (e: React.MouseEvent) => {
      e.preventDefault();
      setCurrentSlide((prev) => (prev + 1) % featuredPosts.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
      e.preventDefault();
      setCurrentSlide((prev) => (prev - 1 + featuredPosts.length) % featuredPosts.length);
  };

  const handleCategoryClick = (id: number | null) => {
    setActiveCategoryId(id);
    const newParams = new URLSearchParams(searchParams);
    if (id === null) {
      newParams.delete('category');
    } else {
      newParams.set('category', String(id));
    }
    setSearchParams(newParams);
  };

  const clearTagFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('tag');
    setSearchParams(newParams);
  }

  // 递归渲染分类树
  const renderCategoryTree = (parentId: number | null = null, level = 0) => {
      // 查找当前层级的分类（parentId 匹配）
      const cats = categories.filter((c) => c.parentId === parentId);
      
      if (cats.length === 0) return null;

      return (
          <ul className={`space-y-1 ${level > 0 ? 'ml-4 border-l border-slate-200 dark:border-slate-800 pl-2' : ''}`}>
              {cats.map((cat) => {
                  const hasChildren = categories.some((c) => c.parentId === cat.id);
                  const isExpanded = expandedCategories.has(cat.id);
                  const isActive = activeCategoryId === cat.id;

                  return (
                      <li key={cat.id}>
                          <div className={`flex items-center justify-between group rounded-lg px-2 py-1.5 transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                              <button 
                                onClick={() => handleCategoryClick(cat.id)}
                                className="flex-grow text-left text-sm flex items-center gap-2"
                              >
                                  {hasChildren ? (
                                      isExpanded ? <FolderOpen className="w-4 h-4 text-amber-400"/> : <Folder className="w-4 h-4 text-amber-400"/>
                                  ) : (
                                      <span className="w-4 h-4 block bg-slate-200 dark:bg-slate-700 rounded-full scale-50"></span>
                                  )}
                                  {cat.name}
                              </button>
                              <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full mr-1">
                                  {getCategoryCount(cat.id)}
                              </span>
                              {hasChildren && (
                                  <button onClick={(e) => toggleExpand(cat.id, e)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                              )}
                          </div>
                          {hasChildren && isExpanded && renderCategoryTree(cat.id, level + 1)}
                      </li>
                  );
              })}
          </ul>
      );
  };

  return (
    <div className="space-y-8">
      {/* Featured Carousel Section */}
      {!searchQuery && !tagFilter && !activeCategoryId && featuredPosts.length > 0 && (
        <div className="relative w-full h-56 md:h-96 rounded-2xl overflow-hidden shadow-2xl mb-8 md:mb-12 group">
           {/* Slides */}
           {featuredPosts.map((post, index) => (
               <div 
                key={post.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
               >
                    <Link to={`/post/${post.id}`} className="block w-full h-full relative">
                        <img 
                        src={post.coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12">
                            <div className="transform translate-y-0 transition-transform duration-500">
                                <span className="inline-block px-2 py-1 mb-2 md:mb-4 text-[10px] md:text-xs font-bold tracking-wider text-white uppercase bg-primary-600 rounded-full w-fit">
                                    精选 · {getCategoryName(post.categoryId)}
                                </span>
                                <h1 className="text-xl md:text-5xl font-serif font-bold text-white mb-2 leading-tight drop-shadow-lg line-clamp-2">
                                    {post.title}
                                </h1>
                                <p className="text-slate-200 max-w-2xl text-xs md:text-lg line-clamp-2 drop-shadow-md hidden md:block">
                                    {post.excerpt}
                                </p>
                            </div>
                        </div>
                    </Link>
               </div>
           ))}

           {/* Controls */}
           {featuredPosts.length > 1 && (
               <>
                <button 
                    onClick={prevSlide} 
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-1 md:p-2 rounded-full backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                    <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                <button 
                    onClick={nextSlide} 
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-1 md:p-2 rounded-full backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                    <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {featuredPosts.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-4 md:w-6' : 'bg-white/50'}`}
                        />
                    ))}
                </div>
               </>
           )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar: Categories (Order 1 on mobile to appear at top) */}
          <div className="lg:col-span-1 order-1 lg:order-1">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sticky top-24">
                  <div 
                    className="flex items-center justify-between cursor-pointer lg:cursor-default"
                    onClick={() => window.innerWidth < 1024 && setIsMobileCategoryOpen(!isMobileCategoryOpen)}
                  >
                      <h3 className="font-bold text-lg font-serif text-slate-900 dark:text-white">分类目录</h3>
                      <div className="flex items-center gap-2">
                        {activeCategoryId && (
                            <button onClick={(e) => {e.stopPropagation(); handleCategoryClick(null);}} className="text-xs text-red-500 hover:underline">清除</button>
                        )}
                        {/* Mobile Toggle Chevron */}
                        <div className="lg:hidden text-slate-400">
                           {isMobileCategoryOpen ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                        </div>
                      </div>
                  </div>
                  
                  {/* Collapsible Section on Mobile */}
                  <div className={`${isMobileCategoryOpen ? 'block' : 'hidden'} lg:block mt-4`}>
                      {renderCategoryTree()}
                      
                      {/* Tag Cloud Preview */}
                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                          <h3 className="font-bold text-sm mb-4 text-slate-500 dark:text-slate-400 uppercase tracking-wider">热门标签</h3>
                          <div className="flex flex-wrap gap-3 justify-center items-baseline">
                             {Object.entries(tagCounts)
                                .sort(([,a], [,b]) => b - a) // 按数量排序
                                .map(([tag, count]) => (
                                 <Link 
                                    key={tag} 
                                    to={`/?tag=${tag}`} 
                                    className={`${getTagSizeClass(count)} px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300`}
                                    title={`${count} 篇文章`}
                                    style={{ opacity: Math.max(0.6, Math.min(1, count / 5)) }} // 根据数量调整透明度
                                 >
                                    {tag}
                                 </Link>
                             ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Main Content: Posts */}
          <div className="lg:col-span-3 order-2 lg:order-2">
             {/* Filters Status */}
             {(searchQuery || tagFilter || activeCategoryId) && (
                <div className="mb-6 flex items-center gap-2 flex-wrap">
                   <Filter className="w-4 h-4 text-slate-400" />
                   {activeCategoryId && (
                       <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium flex items-center gap-1">
                           分类: {getCategoryName(activeCategoryId)}
                           <button onClick={() => handleCategoryClick(null)}><X className="w-3 h-3" /></button>
                       </span>
                   )}
                   {tagFilter && (
                       <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium flex items-center gap-1">
                           标签: {tagFilter}
                           <button onClick={clearTagFilter}><X className="w-3 h-3" /></button>
                       </span>
                   )}
                   {searchQuery && (
                       <span className="text-sm text-slate-500">搜索: "{searchQuery}"</span>
                   )}
                </div>
             )}

             {paginatedPosts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-medium text-slate-400">未找到相关文章。</h3>
                  <button onClick={() => {handleCategoryClick(null); clearTagFilter(); setSearchParams({});}} className="mt-4 text-primary-600 font-bold">查看全部</button>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {paginatedPosts.map((post) => (
                    <article key={post.id} className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row">
                      <Link to={`/post/${post.id}`} className="block relative overflow-hidden w-full md:w-1/3 h-40 md:min-h-full flex-shrink-0">
                        <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur text-[10px] md:text-xs font-bold px-2 py-1 rounded text-white">
                          {getCategoryName(post.categoryId)}
                        </div>
                      </Link>
                      <div className="p-4 md:p-6 flex flex-col flex-grow justify-between">
                         <div>
                             <div className="flex items-center gap-2 mb-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {format(post.createdAt, 'yyyy年M月d日')}
                             </div>
                             <Link to={`/post/${post.id}`} className="block">
                               <h2 className="text-lg md:text-xl font-serif font-bold mb-2 text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                                 {post.title}
                               </h2>
                             </Link>
                             <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed mb-3 md:mb-4">
                               {post.excerpt}
                             </p>
                         </div>
                         <div className="flex items-center justify-between mt-auto">
                            <div className="flex gap-2 flex-wrap">
                              {post.tags.slice(0, 3).map((tag) => (
                                <Link 
                                  key={tag} 
                                  to={`/?tag=${tag}`}
                                  className="flex items-center text-[10px] md:text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 hover:text-primary-600 transition-colors"
                                >
                                   <Tag className="w-3 h-3 mr-1" /> {tag}
                                </Link>
                              ))}
                            </div>
                            <Link to={`/post/${post.id}`} className="text-primary-600 text-xs md:text-sm font-medium hover:text-primary-700 flex items-center whitespace-nowrap ml-2">
                              阅读 <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                            </Link>
                         </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

             {/* Pagination Controls */}
             {totalPages > 1 && (
                 <div className="flex justify-center items-center mt-12 gap-2">
                     <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                         <ChevronLeft className="w-5 h-5" />
                     </button>
                     
                     <span className="text-sm font-medium text-slate-500 mx-2">
                         第 {currentPage} 页 / 共 {totalPages} 页
                     </span>

                     <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                         <ChevronRight className="w-5 h-5" />
                     </button>
                 </div>
             )}
          </div>
      </div>
    </div>
  );
};