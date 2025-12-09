import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getPosts } from '../services/api';
import { Category, BlogPost } from '../types';
import { Calendar, User, Tag, PlayCircle } from 'lucide-react';

const BIBLE_ORDER = [
  "创世记", "出埃及记", "利未记", "民数记", "申命记",
  "约书亚记", "士师记", "路得记", "撒母耳记上", "撒母耳记下",
  "列王纪上", "列王纪下", "历代志上", "历代志下", "以斯拉记", 
  "尼希米记", "以斯帖记","约伯记", "诗篇", "箴言", "传道书", 
  "雅歌", "以赛亚书","耶利米书", "耶利米哀歌", "以西结书",
  "但以理书", "何西阿书", "约珥书", "阿摩司书", "俄巴底亚书",
  "约拿书", "弥迦书", "那鸿书", "哈巴谷书", "西番雅书", 
  "哈该书", "撒迦利亚书", "玛拉基书","马太福音","马可福音", 
  "路加福音", "约翰福音", "使徒行传", "罗马书","哥林多前书", 
  "哥林多后书", "加拉太书", "以弗所书", "腓立比书","歌罗西书", 
  "帖撒罗尼迦前书", "帖撒罗尼迦后书", "提摩太前书", "提摩太后书","提多书",
  "腓利门书", "希伯来书", "雅各书", "彼得前书", "彼得后书",
  "约翰一书", "约翰二书", "约翰三书", "犹大书", "启示录"
];

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedL1Id, setSelectedL1Id] = useState<number | null>(null);
  const [selectedL2Id, setSelectedL2Id] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, posts] = await Promise.all([getCategories(), getPosts()]);
        
        // Sort categories
        const sortedCats = cats.sort((a, b) => {
            const indexA = BIBLE_ORDER.indexOf(a.name);
            const indexB = BIBLE_ORDER.indexOf(b.name);

            const isBibleA = indexA !== -1;
            const isBibleB = indexB !== -1;

            if (isBibleA && isBibleB) {
                return indexA - indexB;
            }
            if (isBibleA) return 1; // Bible books come AFTER others
            if (isBibleB) return -1; // Bible books come AFTER others

            return a.name.localeCompare(b.name, 'zh-CN');
        });

        setCategories(sortedCats);
        setAllPosts(posts);

        // Select first L1 category by default
        const firstL1 = sortedCats.find(c => !c.parentId);
        if (firstL1) {
            setSelectedL1Id(firstL1.id);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const l1Categories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  
  const l2Categories = useMemo(() => {
    if (!selectedL1Id) return [];
    return categories.filter(c => c.parentId === selectedL1Id);
  }, [categories, selectedL1Id]);

  const activeCategoryId = selectedL2Id || selectedL1Id;

  const getDescendantIds = (rootId: number): number[] => {
      const children = categories.filter(c => c.parentId === rootId);
      let ids = children.map(c => c.id);
      children.forEach(child => {
          ids = [...ids, ...getDescendantIds(child.id)];
      });
      return ids;
  };

  const filteredPosts = useMemo(() => {
    if (!activeCategoryId) return [];
    
    const targetIds = new Set([activeCategoryId, ...getDescendantIds(activeCategoryId)]);
    return allPosts.filter(p => targetIds.has(p.categoryId));
  }, [allPosts, activeCategoryId, categories]);

  const handleL1Select = (id: number) => {
    setSelectedL1Id(id);
    setSelectedL2Id(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Top Horizontal L1 Categories */}
      <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex overflow-x-auto h-full px-4 space-x-6 no-scrollbar items-center">
          {l1Categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleL1Select(cat.id)}
              className={`whitespace-nowrap px-2 py-1 text-lg font-medium transition-colors relative ${
                selectedL1Id === cat.id 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {cat.name}
              {selectedL1Id === cat.id && (
                <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Vertical L2 Categories */}
        <div className="w-24 md:w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-1 md:p-2 space-y-1">
            <button
              onClick={() => setSelectedL2Id(null)}
              className={`w-full text-left px-2 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
                selectedL2Id === null 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              全部
            </button>
            {l2Categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedL2Id(cat.id)}
                className={`w-full text-left px-2 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  selectedL2Id === cat.id 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 p-2 md:p-8">
          <div className="max-w-4xl mx-auto pb-20 md:pb-0">
            {filteredPosts.length > 0 ? (
              <div className="grid gap-3 md:gap-6">
                {filteredPosts.map(post => (
                  <Link 
                    key={post.id} 
                    to={`/post/${post.id}`}
                    className="block group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex flex-col">
                      {post.coverImage && (
                        <div className="h-32 w-full flex-shrink-0 overflow-hidden">
                          <img 
                            src={post.coverImage} 
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        
                        <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-6 mb-2 flex-1">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {post.tags && post.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] rounded font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Tag className="w-8 h-8" />
                </div>
                <p>该分类下暂无文章</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
