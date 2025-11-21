import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../App';
import { BlogPost, Category } from '../types';
import { Save, Eye, Edit3, X, ArrowLeft, Tag as TagIcon, Image as ImageIcon, Star, Mic, Trash2, Settings, Upload, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { api } from '../services/api';

interface EditorProps {
  onSave: (post: BlogPost) => void;
  categories: Category[];
  onAddCategory: (name: string, parentId: string | null) => void;
  onDeleteCategory: (id: string) => void;
  posts: BlogPost[];
}

export const Editor: React.FC<EditorProps> = ({ onSave, categories, onAddCategory, onDeleteCategory, posts }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [coverImage, setCoverImage] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Category Creation/Management State
  const [isManagingCategory, setIsManagingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string>(''); // empty string = root

  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const suggestedTags = useMemo(() => {
    const allTags = new Set<string>();
    posts.forEach(p => p.tags.forEach(t => allTags.add(t)));
    return Array.from(allTags).filter(t => !currentTags.includes(t));
  }, [posts, currentTags]);


  useEffect(() => {
    if (!id) {
      // 新建文章：强制默认第一个分类
      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }
    } else {
      // 编辑文章：加载已有数据
      const post = posts.find(p => p.id === id);
      if (post) {
        setTitle(post.title);
        setContent(post.content);
        setExcerpt(post.excerpt || '');
        setCategoryId(post.categoryId || categories[0]?.id || '1'); // 防止空
        setCurrentTags(post.tags);
        setCoverImage(post.coverImage);
        setIsFeatured(post.isFeatured || false);
        setAudioUrl(post.audioUrl || '');
        // ...其他 set
      }
    }
  }, [id, posts, categories]);
  // useEffect(() => {
  //   if (id && posts.length > 0) {
  //     const post = posts.find(p => p.id === id);
  //     if (post) {
  //       setTitle(post.title);
  //       setContent(post.content);
  //       setExcerpt(post.excerpt);
  //       setCategoryId(post.categoryId);
  //       setCurrentTags(post.tags);
  //       setCoverImage(post.coverImage);
  //       setIsFeatured(post.isFeatured || false);
  //       setAudioUrl(post.audioUrl || '');
  //     }
  //   } else {
  //     // Default category if not editing
  //     if (categories.length > 0 && !categoryId) {
  //       setCategoryId(categories[0].id);
  //     }
  //   }
  // }, [id, posts, categories]);

  if (!user || !isAdmin) {
    return <div className="text-center py-20 text-red-500 font-bold">拒绝访问。仅限管理员。</div>;
  }

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In production, use a real secret or token from AuthContext
    const token = "my-secret-a8f5b3e7d2c9f1g4h6j8k9m2n4p6q8r0t1y3u5i7o9";

    try {
      if (type === 'image') setUploadingImage(true);
      else setUploadingAudio(true);

      const uploadedUrl = await api.uploadFile(file, token);

      if (type === 'image') setCoverImage(uploadedUrl);
      else setAudioUrl(uploadedUrl);

    } catch (error) {
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}\n\n提示: 您需要部署后端 Worker 才能使用上传功能。`);
      console.error(error);
    } finally {
      if (type === 'image') setUploadingImage(false);
      else setUploadingAudio(false);
      // Reset input
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

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return alert("标题和内容不能为空");

    setIsSubmitting(true);

    // === 关键修复：强制保证 categoryId 永远有值 ===
    let finalCategoryId = categoryId.trim();
    if (!finalCategoryId && categories.length > 0) {
      finalCategoryId = categories[0].id; // 默认第一个分类
    }

    const finalCoverImage = coverImage || `https://picsum.photos/800/400?random=${Date.now()}`;
    const finalExcerpt = excerpt.trim() || content.substring(0, 150).replace(/\n/g, ' ') + '...';

    const newPost: BlogPost = {
      id: id || Date.now().toString(), // 改用时间戳更稳定（crypto.randomUUID 在某些环境有问题）
      title: title.trim(),
      excerpt: finalExcerpt,
      content: content.trim(),
      coverImage: finalCoverImage,
      author: user || { username: 'Admin', role: 'ADMIN' },
      createdAt: id ? (posts.find(p => p.id === id)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
      categoryId: finalCategoryId,  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
      tags: currentTags,
      views: id ? (posts.find(p => p.id === id)?.views || 0) : 0,
      isFeatured: isFeatured || false,
      audioUrl: audioUrl || ''
    };

    try {
      // 保存到后端（D1 永久存储）
      await api.savePost(newPost, "a8f5b3e7d2c9f1g4h6j8k9m2n4p6q8r0t1y3u5i7o9"); // ← 改成你真实的长密码！！！
      alert("文章发布成功！");
    } catch (e: any) {
      console.error("后端保存失败", e);
      alert("后端保存失败，但已保存到本地：" + e.message);
    }

    onSave(newPost); // 本地状态也更新
    setIsSubmitting(false);
    navigate('/');
  };
  // const handleSave = async () => {
  //   if (!title || !content) return alert("标题和内容不能为空");

  //   setIsSubmitting(true);
  //   const finalCoverImage = coverImage || `https://picsum.photos/800/400?random=${Math.floor(Math.random()*100)}`;
  //   const finalExcerpt = excerpt.trim() || (content.substring(0, 100) + '...');

  //   const newPost: BlogPost = {
  //     id: id || crypto.randomUUID(), // Use UUID for API compatibility
  //     title,
  //     excerpt: finalExcerpt,
  //     content,
  //     coverImage: finalCoverImage,
  //     author: user,
  //     createdAt: id ? (posts.find(p => p.id === id)?.createdAt || Date.now()) : Date.now(),
  //     updatedAt: Date.now(),
  //     categoryId: categoryId || (categories[0]?.id),
  //     tags: currentTags,
  //     views: id ? (posts.find(p => p.id === id)?.views || 0) : 0,
  //     isFeatured,
  //     audioUrl
  //   };

  //   // Try saving to API first
  //   try {
  //      // Note: Ideally we pass the auth token here
  //      await api.savePost(newPost, "my-secret-password");
  //   } catch (e) {
  //      console.warn("Backend save failed, falling back to local state only", e);
  //   }

  //   onSave(newPost);
  //   setIsSubmitting(false);
  //   navigate('/');
  // };

  // const handleAddCategory = () => {
  //   if (newCategoryName.trim()) {
  //     const parent = newCategoryParent === '' ? null : newCategoryParent;
  //     onAddCategory(newCategoryName.trim(), parent);
  //     setNewCategoryName('');
  //   }
  // };

  // const handleDeleteCategoryClick = (e: React.MouseEvent, catId: string) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   onDeleteCategory(catId);
  // };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const newCat = await api.createCategory(newCategoryName.trim());
      // 如果你有本地 categories state，这里要更新
      // 但最好在 App.tsx 里统一管理，重新 fetch
      alert("分类添加成功！");
      setNewCategoryName('');
      // 刷新分类列表（推荐在父组件重新 fetch）
      window.location.reload(); // 简单粗暴，后面可以优化
    } catch (err) {
      alert("添加失败");
    }
  };

  const handleDeleteCategoryClick = async (e: React.MouseEvent, catId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('确定删除这个分类？')) return;

    try {
      await api.deleteCategory(catId);
      alert("删除成功");
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "删除失败，可能分类下有文章");
    }
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
            {previewMode ? <><Edit3 className="w-4 h-4 mr-2" /> 编辑</> : <><Eye className="w-4 h-4 mr-2" /> 预览</>}
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
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
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
            </div>

            {/* Excerpt Field */}
            <textarea
              placeholder="文章简介 (将会显示在卡片上)"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
            />

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
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                    {uploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                      <button onClick={() => setIsManagingCategory(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
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
                        onChange={e => setNewCategoryParent(e.target.value)}
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
                      onChange={(e) => setCategoryId(e.target.value)}
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
              <div className="flex-grow flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-100 dark:bg-slate-800 rounded-lg min-h-[42px]">
                  <TagIcon className="w-4 h-4 text-slate-400" />
                  {currentTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1 rounded text-xs shadow-sm">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
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
                </div>
                {/* Suggested Tags */}
                {suggestedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1">推荐标签:</span>
                    {suggestedTags.slice(0, 8).map(tag => (
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
