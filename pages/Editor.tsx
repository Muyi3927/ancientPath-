import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../App';
import { BlogPost, Category } from '../types';
import { Save, Eye, Edit3, X, ArrowLeft, Tag as TagIcon, Image as ImageIcon, Star, Mic, Trash2, Settings, Upload, Loader2, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { getPosts, getPostById, getCategories, createPost, updatePost, deletePost, createCategory, deleteCategory, uploadFile } from '../services/api';
import { generateSummary } from '../services/aiService';

interface EditorProps {
  onSave: (post: BlogPost) => void;
  categories: Category[];
  onAddCategory: (name: string, parentId: number | null) => void;
  onDeleteCategory: (id: number) => void;
  posts: BlogPost[];
  onRefresh: () => Promise<void>;
}

export const Editor: React.FC<EditorProps> = ({ onSave, categories, onAddCategory, onDeleteCategory, posts, onRefresh }) => {
  const navigate = useNavigate();
  const { id: idString } = useParams<{ id: string }>();
  const id = idString ? Number(idString) : undefined;
  const { user, isAdmin } = useContext(AuthContext);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [coverImage, setCoverImage] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isMetaCollapsed, setIsMetaCollapsed] = useState(false);

  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Category Creation/Management State
  const [isManagingCategory, setIsManagingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<number | ''>(''); // empty string = root

  // Tag Management State
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');

  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const suggestedTags = useMemo(() => {
    const allTags = new Set<string>();
    posts.forEach(p => p.tags.forEach(t => allTags.add(t)));
    return Array.from(allTags).filter(t => !currentTags.includes(t));
  }, [posts, currentTags]);

  // All unique tags for management
  const allUniqueTags = useMemo(() => {
      const tags = new Set<string>();
      posts.forEach(p => p.tags.forEach(t => tags.add(t)));
      return Array.from(tags).sort();
  }, [posts]);

  useEffect(() => {
    if (id && posts.length > 0) {
      const post = posts.find(p => p.id === id);
      if (post) {
        setTitle(post.title);
        setContent(post.content);
        setExcerpt(post.excerpt);
        setCategoryId(post.categoryId);
        setCurrentTags(post.tags);
        setCoverImage(post.coverImage);
        setIsFeatured(post.isFeatured || false);
        setAudioUrl(post.audioUrl || '');
      }
    } else {
        // Default category if not editing
        if (categories.length > 0 && !categoryId) {
            setCategoryId(categories[0].id);
        }
    }
  }, [id, posts, categories]);

  if (!user || !isAdmin) {
    return <div className="text-center py-20 text-red-500 font-bold">拒绝访问。仅限管理员。</div>;
  }

  // Tag Management Functions
  const handleRenameTag = async (oldTag: string) => {
      const newTag = newTagName.trim();
      if (!newTag || newTag === oldTag) return;
      
      if (!window.confirm(`确定将所有文章中的标签 "${oldTag}" 修改为 "${newTag}" 吗？`)) return;

      const affectedPosts = posts.filter(p => p.tags.includes(oldTag));
      setIsSubmitting(true);
      try {
          await Promise.all(affectedPosts.map(p => {
              const newTags = p.tags.map(t => t === oldTag ? newTag : t);
              // Remove duplicates if newTag already existed
              const uniqueTags = Array.from(new Set(newTags));
              return updatePost(p.id, { tags: uniqueTags });
          }));
          await onRefresh();
          setEditingTag(null);
          setNewTagName('');
          alert(`已更新 ${affectedPosts.length} 篇文章的标签。`);
      } catch (e) {
          console.error(e);
          alert('更新标签失败');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeleteTagGlobal = async (tag: string) => {
      if (!window.confirm(`确定要删除标签 "${tag}" 吗？这将从所有包含该标签的文章中移除它。`)) return;
      
      const affectedPosts = posts.filter(p => p.tags.includes(tag));
      setIsSubmitting(true);
      try {
          await Promise.all(affectedPosts.map(p => {
              const newTags = p.tags.filter(t => t !== tag);
              return updatePost(p.id, { tags: newTags });
          }));
          await onRefresh();
          alert(`已从 ${affectedPosts.length} 篇文章中移除标签 "${tag}"。`);
      } catch (e) {
          console.error(e);
          alert('删除标签失败');
      } finally {
          setIsSubmitting(false);
      }
  };

  // Drag and Drop State
  const [draggedTagIndex, setDraggedTagIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedTagIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedTagIndex === null || draggedTagIndex === targetIndex) return;

    const newTags = [...currentTags];
    const [draggedTag] = newTags.splice(draggedTagIndex, 1);
    newTags.splice(targetIndex, 0, draggedTag);
    
    setCurrentTags(newTags);
    setDraggedTagIndex(null);
  };

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'image') setUploadingImage(true);
      else setUploadingAudio(true);

      const publicUrl = await uploadFile(file);

      if (type === 'image') setCoverImage(publicUrl);
      else setAudioUrl(publicUrl);

    } catch (error) {
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error(error);
    } finally {
      if (type === 'image') setUploadingImage(false);
      else setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !currentTags.includes(trimmed)) {
      setCurrentTags([...currentTags, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(t => t !== tagToRemove));
  };

  const handleGenerateSummary = async () => {
    if (!content) return alert("请先输入文章内容");
    setIsGeneratingSummary(true);
    try {
      const summary = await generateSummary(content);
      setExcerpt(summary);
    } catch (e) {
      alert("生成摘要失败");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSave = async () => {
    if (!title || !content || categoryId === undefined) return alert("标题、内容和分类不能为空");
    
    setIsSubmitting(true);
    const finalCoverImage = coverImage || `https://picsum.photos/800/400?random=${Math.floor(Math.random()*100)}`;
    const finalExcerpt = excerpt.trim() || (content.substring(0, 100) + '...');

    const postData = {
      title,
      excerpt: finalExcerpt,
      content,
      coverImage: finalCoverImage,
      categoryId: categoryId,
      tags: currentTags,
      isFeatured,
      audioUrl
    };

    try {
       if (id) {
         await updatePost(id, postData);
       } else {
         await createPost(postData);
       }
       
       // Refresh data from server to ensure consistency
       await onRefresh();
       
       navigate('/');
    } catch (e) {
       console.error("保存失败", e);
       alert(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const parent = newCategoryParent === '' ? null : newCategoryParent;
      onAddCategory(newCategoryName.trim(), parent);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategoryClick = (e: React.MouseEvent, catId: number) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteCategory(catId);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold font-serif">{id ? '编辑文章' : '写新文章'}</h1>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center text-sm font-medium transition-colors"
           >
             {previewMode ? <><Edit3 className="w-4 h-4 mr-2"/> 编辑</> : <><Eye className="w-4 h-4 mr-2"/> 预览</>}
           </button>
           <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center text-sm font-bold shadow-lg shadow-green-500/30 transition-colors"
           >
             {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
             发布
           </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-grow flex gap-6 h-full overflow-hidden">
        
        {/* Input Column */}
        <div className={`flex flex-col gap-4 h-full overflow-y-auto pr-2 transition-all duration-300 ${previewMode ? 'w-0 opacity-0 hidden' : 'w-full md:w-1/2'}`}>
            
            {/* Meta Data */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 transition-all">
                <div className="flex gap-2 items-center">
                    <input 
                        type="text" 
                        placeholder="文章标题" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="flex-grow bg-transparent text-2xl font-serif font-bold focus:outline-none placeholder-slate-300 dark:placeholder-slate-600"
                    />
                    <button 
                        onClick={() => setIsFeatured(!isFeatured)}
                        className={`p-2 rounded-full transition-all ${isFeatured ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-100 text-slate-400'}`}
                        title={isFeatured ? "取消精选" : "设为精选"}
                    >
                        <Star className={`w-5 h-5 ${isFeatured ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setIsMetaCollapsed(!isMetaCollapsed)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                        title={isMetaCollapsed ? "展开元数据" : "收起元数据"}
                    >
                        {isMetaCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                </div>
                
                {!isMetaCollapsed && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Excerpt Field */}
                        <div className="relative">
                            <textarea 
                                placeholder="文章简介 (将会显示在卡片上)"
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20 pr-10"
                            />
                            <button
                                onClick={handleGenerateSummary}
                                disabled={isGeneratingSummary || !content}
                                className="absolute right-2 bottom-2 p-1.5 bg-purple-100 text-purple-600 rounded-md hover:bg-purple-200 disabled:opacity-50 transition-colors"
                                title="AI 生成摘要"
                            >
                                {isGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Cover Image Input */}
                            <div className="flex flex-col gap-2">
                                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2">
                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={coverImage}
                                        onChange={(e) => setCoverImage(e.target.value)}
                                        placeholder="封面图片链接 (https://...)"
                                        className="flex-grow bg-transparent text-sm focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => imageInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded hover:bg-primary-100 text-slate-600 hover:text-primary-600 transition-colors"
                                        title="上传图片"
                                    >
                                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                    </button>
                                </div>
                            </div>

                            {/* Audio URL Input */}
                            <div className="flex flex-col gap-2">
                                <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} />
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2">
                                    <Mic className="w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={audioUrl}
                                        onChange={(e) => setAudioUrl(e.target.value)}
                                        placeholder="音频链接 (mp3/wav...)"
                                        className="flex-grow bg-transparent text-sm focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => audioInputRef.current?.click()}
                                        disabled={uploadingAudio}
                                        className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded hover:bg-primary-100 text-slate-600 hover:text-primary-600 transition-colors"
                                        title="上传音频"
                                    >
                                        {uploadingAudio ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-start">
                            {/* Category Select & Manage */}
                            <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
                            {isManagingCategory ? (
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-lg absolute z-10 w-72 mt-10">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-500">分类管理</span>
                                    <button onClick={() => setIsManagingCategory(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                                </div>
                                
                                {/* Add New */}
                                <div className="space-y-2">
                                    <input 
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="新分类名称"
                                        className="w-full bg-white dark:bg-slate-700 rounded px-2 py-1.5 text-sm outline-none border border-slate-200 dark:border-slate-600"
                                    />
                                    <select 
                                        value={newCategoryParent} 
                                        onChange={e => setNewCategoryParent(Number(e.target.value) || '')}
                                        className="w-full bg-white dark:bg-slate-700 rounded px-2 py-1.5 text-sm outline-none border border-slate-200 dark:border-slate-600"
                                    >
                                        <option value="">(无父分类 - 顶级)</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={handleAddCategory} className="w-full py-1.5 bg-primary-600 text-white rounded text-xs font-bold hover:bg-primary-700">添加分类</button>
                                </div>

                                {/* List to Delete */}
                                <div className="max-h-40 overflow-y-auto space-y-1 pt-2">
                                    {categories.map(c => (
                                        <div key={c.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded group">
                                            <span className="truncate max-w-[180px]">{c.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={(e) => handleDeleteCategoryClick(e, c.id)} 
                                                className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                                title="删除此分类"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 relative">
                                    <select 
                                        value={categoryId} 
                                        onChange={(e) => setCategoryId(Number(e.target.value))}
                                        className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none flex-grow"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.parentId ? `-- ${c.name}` : c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={() => setIsManagingCategory(true)} 
                                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700" 
                                        title="管理分类"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            </div>

                            {/* Tag Management */}
                            <div className="flex-grow flex flex-col gap-2 relative">
                                <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-100 dark:bg-slate-800 rounded-lg min-h-[42px]">
                                    <TagIcon className="w-4 h-4 text-slate-400" />
                                    {currentTags.map((tag, index) => (
                                        <span 
                                          key={tag} 
                                          draggable
                                          onDragStart={() => handleDragStart(index)}
                                          onDragOver={handleDragOver}
                                          onDrop={() => handleDrop(index)}
                                          className={`flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1 rounded text-xs shadow-sm cursor-move transition-all ${draggedTagIndex === index ? 'opacity-50 scale-95' : 'hover:scale-105'}`}
                                          title="拖动以排序"
                                        >
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </span>
                                    ))}
                                    <input 
                                        type="text" 
                                        placeholder="输入标签..." 
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        className="bg-transparent text-sm outline-none flex-grow min-w-[80px]"
                                    />
                                    <button 
                                        onClick={() => setIsManagingTags(true)}
                                        className="ml-auto p-1 text-slate-400 hover:text-slate-600"
                                        title="管理所有标签"
                                    >
                                        <Settings className="w-3 h-3" />
                                    </button>
                                </div>
                                
                                {/* Tag Manager Modal */}
                                {isManagingTags && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">标签管理</h3>
                                            <button onClick={() => setIsManagingTags(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-2">
                                            {allUniqueTags.map(tag => (
                                                <div key={tag} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-xs">
                                                    {editingTag === tag ? (
                                                        <div className="flex items-center gap-2 flex-grow">
                                                            <input 
                                                                type="text" 
                                                                value={newTagName}
                                                                onChange={e => setNewTagName(e.target.value)}
                                                                className="bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-2 py-1 flex-grow outline-none"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleRenameTag(tag)} className="text-green-600 hover:text-green-700 font-bold">保存</button>
                                                            <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:text-slate-600">取消</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">{tag}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => { setEditingTag(tag); setNewTagName(tag); }}
                                                                    className="text-primary-600 hover:text-primary-700 p-1"
                                                                    title="重命名"
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteTagGlobal(tag)}
                                                                    className="text-red-500 hover:text-red-600 p-1"
                                                                    title="删除标签 (从所有文章中移除)"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                            {allUniqueTags.length === 0 && <div className="text-center text-slate-400 py-4">暂无标签</div>}
                                        </div>
                                    </div>
                                )}

                                {/* Suggested Tags */}
                                {suggestedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-1">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold mt-1">推荐标签:</span>
                                        {suggestedTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleAddTag(tag)}
                                                className="text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 transition-colors"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Markdown Area */}
            <div className="flex-grow p-1">
                <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="使用 Markdown 开始写作..."
                    className="w-full h-full bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary-500 outline-none resize-none font-mono text-sm leading-relaxed"
                />
            </div>
        </div>

        {/* Preview Column */}
        <div className={`h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-y-auto p-8 transition-all duration-300 ${previewMode ? 'w-full max-w-4xl mx-auto' : 'w-1/2 hidden md:block'}`}>
            {coverImage && (
                <div className="w-full h-48 mb-6 rounded-lg overflow-hidden">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                </div>
            )}
            {title ? (
                <h1 className="text-4xl font-serif font-bold mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">{title}</h1>
            ) : (
                 <h1 className="text-4xl font-serif font-bold mb-6 text-slate-300">无标题</h1>
            )}
            <div className="text-slate-500 italic mb-4 border-l-4 border-slate-300 pl-4 py-1">{excerpt || '简介将显示在这里...'}</div>
            {audioUrl && (
                <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs font-bold text-slate-500 mb-1">音频预览</div>
                    <audio controls src={audioUrl} className="w-full h-8"></audio>
                </div>
            )}
            <MarkdownRenderer content={content || '*预览内容将显示在这里...*'} />
        </div>
      </div>
    </div>
  );
};
