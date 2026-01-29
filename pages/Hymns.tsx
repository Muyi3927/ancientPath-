import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { getCategories, getPosts } from '../services/api';
import { Category, BlogPost } from '../types';
import { Tag, Music, Clock, ChevronRight } from 'lucide-react';

export const Hymns: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs: 'metrical' (韵律诗篇) or 'hymns' (圣诗)
  const [activeTab, setActiveTab] = useState<'metrical' | 'hymns'>('metrical');
  
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, posts] = await Promise.all([getCategories(), getPosts()]);
        
        // Sort categories by name naturally
        cats.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
        
        setCategories(cats);
        setAllPosts(posts);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Find the main category IDs
  const metricalRoot = useMemo(() => categories.find(c => c.name === '韵律诗篇'), [categories]);
  const hymnsRoot = useMemo(() => categories.find(c => c.name === '圣诗'), [categories]);

  // Get current active root category
  const activeRoot = activeTab === 'metrical' ? metricalRoot : hymnsRoot;

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name || '未知分类';

  // Get subcategories (e.g. Psalm 1, Psalm 2...)
  const subCategories = useMemo(() => {
    if (!activeRoot) return [];
    return categories.filter(c => c.parentId === activeRoot.id);
  }, [categories, activeRoot]);

  // Recursion for posts
  const getDescendantIds = useMemo(() => {
    const fetchDescendants = (rootId: number): number[] => {
      const children = categories.filter(c => c.parentId === rootId);
      let ids = children.map(c => c.id);
      children.forEach(child => {
          ids = [...ids, ...fetchDescendants(child.id)];
      });
      return ids;
    };
    return fetchDescendants;
  }, [categories]);

  // Auto-select "All" (null) by default when switching tabs
  useEffect(() => {
      setSelectedSubCatId(null);
  }, [activeTab]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    if (!activeRoot) return [];
    
    // If selectedSubCatId is null, we show ALL posts under the activeRoot (recursively)
    // If selectedSubCatId is set, we show posts under that subcategory (recursively)
    const targetRootId = selectedSubCatId || activeRoot.id;
    const targetIds = new Set([targetRootId, ...getDescendantIds(targetRootId)]);
    
    return allPosts.filter(p => targetIds.has(Number(p.categoryId)) && !p.tags.includes('__draft__'));
  }, [allPosts, activeRoot, selectedSubCatId, getDescendantIds]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const HYMN_FIXED_COVER = "https://media.ancientpath.dpdns.org/images/Hymns/hymncover.webp";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Top Tabs */}
      <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 flex justify-center">
        <div className="flex h-full space-x-8 items-center">
            <button
              onClick={() => { setActiveTab('metrical'); }}
              className={`px-4 py-1 text-lg font-bold transition-colors relative ${
                activeTab === 'metrical'
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              韵律诗篇
              {activeTab === 'metrical' && (
                <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab('hymns'); }}
              className={`px-4 py-1 text-lg font-bold transition-colors relative ${
                activeTab === 'hymns'
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              圣诗
              {activeTab === 'hymns' && (
                <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Subcategories */}
        <div className="w-32 md:w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-2 pb-24 space-y-1">
            {!activeRoot && (
                <div className="p-4 text-sm text-gray-500 text-center">
                    请先在后台创建 "{activeTab === 'metrical' ? '韵律诗篇' : '圣诗'}" 分类
                </div>
            )}
            {/* "All" Button */}
            {activeRoot && (
                <button
                    onClick={() => setSelectedSubCatId(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSubCatId === null 
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    全部
                </button>
            )}
            {subCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedSubCatId(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedSubCatId === cat.id 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {filteredPosts.length > 0 ? (
              <div className="space-y-4 md:space-y-6">
                {filteredPosts.map(post => (
                  <article key={post.id} className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row">
                    <Link to={`/post/${post.id}`} className="block relative overflow-hidden w-full md:w-1/3 h-40 md:min-h-full flex-shrink-0">
                      <img src={HYMN_FIXED_COVER} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
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
                            {post.tags && post.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="flex items-center text-[10px] md:text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">
                                 <Tag className="w-3 h-3 mr-1" /> {tag}
                              </span>
                            ))}
                          </div>
                          <Link to={`/post/${post.id}`} className="text-primary-600 text-xs md:text-sm font-medium hover:text-primary-700 flex items-center whitespace-nowrap ml-2">
                            查看曲谱 <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                          </Link>
                       </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                <Music className="w-16 h-16 mb-4 opacity-20" />
                <p>该分类下暂无内容</p>
                <p className="text-xs mt-2">请在后台添加文章并发布到 "{activeRoot?.name || '对应分类'}" 的子分类中</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};