import React, { useState, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';
import { About } from './pages/About';
import { Bible } from './pages/Bible';
import { Categories } from './pages/Categories';
import { DownloadApp } from './pages/DownloadApp';
import { ThemeContextType, AuthContextType, User, UserRole, BlogPost, Category } from './types';
import { getPosts, getCategories, createCategory, deleteCategory as apiDeleteCategory, deletePost } from './services/api';

// Contexts
export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false
});

export const LayoutContext = createContext<{
  isMenuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
}>({
  isMenuVisible: true,
  setMenuVisible: () => {},
});

const App: React.FC = () => {
  // 主题状态
  const [isDark, setIsDark] = useState(false);
  
  // 菜单可见性状态
  const [isMenuVisible, setMenuVisible] = useState(true);
  
  // 认证状态
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 监听 user 变化并同步到 localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // 数据状态 - 完全依赖后端，初始为空
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化主题
  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isSystemDark);
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // 从后端加载数据
  const refreshPosts = async () => {
    try {
      const [fetchedPosts, fetchedCategories] = await Promise.all([
        getPosts(),
        getCategories()
      ]);
      
      // 仅当获取到有效数据时更新状态
      if (fetchedPosts) setPosts(fetchedPosts);
      if (fetchedCategories && fetchedCategories.length > 0) {
        // 按照名称正序排序 (支持中文)
        fetchedCategories.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        setCategories(fetchedCategories);
      }
    } catch (e) {
      console.error("从 API 加载数据失败", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const login = (username: string, role: UserRole) => {
    setUser({
      id: Date.now().toString(), // 使用 string ID
      username,
      role,
      avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`
    });
  };

  const logout = () => setUser(null);

  const handleSavePost = (post: BlogPost) => {
    const exists = posts.some(p => p.id === post.id);
    if (exists) {
      setPosts(posts.map(p => p.id === post.id ? post : p));
    } else {
      setPosts([post, ...posts]);
    }
  };

  const addCategory = async (name: string, parentId: number | null) => {
    try {
      const newCat = await createCategory({ name, parentId: parentId ?? undefined });
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')));
    } catch (e) {
      console.error('在服务器上创建分类失败:', e);
      alert('无法保存分类到后端，请检查后端部署或网络。');
    }
  };

  const deleteCategory = (id: number) => {
    const categoryToDelete = categories.find(c => c.id === id);
    if (!categoryToDelete) return;

    const affectedPostsCount = posts.filter(p => p.categoryId === id).length;
    const hasChildren = categories.some(c => c.parentId === id);

    let warning = `确定要删除分类 "${categoryToDelete.name}" 吗？`;
    
    if (affectedPostsCount > 0) {
        warning += `\n\n⚠️ 注意：有 ${affectedPostsCount} 篇文章属于此分类。删除后它们将变为"未分类"。`;
    }
    
    if (hasChildren) {
        warning += `\n⚠️ 此分类包含子分类，删除后子分类将变为顶级分类。`;
    }

    if (!window.confirm(warning)) return;
    
    const prevCategories = categories;
    const prevPosts = posts;

    // 乐观更新
    if (affectedPostsCount > 0) {
        // 如果分类被删除，将文章归类为 ID 0 (未分类)
        setPosts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: 0 } : p));
    }
    setCategories(prev => {
      const filtered = prev.filter(c => c.id !== id);
      // 如果父分类被删除，子分类变为顶级分类 (parentId: null)
      return filtered.map(c => c.parentId === id ? { ...c, parentId: null } : c);
    });

    (async () => {
      try {
        await apiDeleteCategory(id);
      } catch (e) {
        console.error('在服务器上删除分类失败:', e);
        alert('无法删除后端分类，已恢复本地数据。');
        // 回滚
        setCategories(prevCategories);
        setPosts(prevPosts);
      }
    })();
  };

  const updatePostInState = (updatedPost: BlogPost) => {
      setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handleDeletePost = async (id: number) => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (e) {
      console.error('删除文章失败:', e);
      alert('删除失败，请重试。');
      return false;
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
      );
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AuthContext.Provider value={{ 
        user, 
        login, 
        logout, 
        isAuthenticated: !!user,
        isAdmin: user?.role === UserRole.ADMIN
      }}>
        <LayoutContext.Provider value={{ isMenuVisible, setMenuVisible }}>
          <HashRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Home posts={posts} categories={categories} />} />
              <Route path="/about" element={<About />} />
              <Route path="/bible" element={<Bible />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/app" element={<DownloadApp />} />
              <Route path="/post/:id" element={<PostDetail posts={posts} updatePost={updatePostInState} onDeletePost={handleDeletePost} categories={categories} />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/editor" 
                element={
                  <Editor 
                    onSave={handleSavePost} 
                    categories={categories} 
                    onAddCategory={addCategory}
                    onDeleteCategory={deleteCategory}
                    posts={posts}
                    onRefresh={refreshPosts}
                  />
                } 
              />
              <Route 
                path="/editor/:id" 
                element={
                  <Editor 
                    onSave={handleSavePost} 
                    categories={categories} 
                    onAddCategory={addCategory}
                    onDeleteCategory={deleteCategory}
                    posts={posts}
                    onRefresh={refreshPosts}
                  />
                } 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </HashRouter>
        </LayoutContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;
