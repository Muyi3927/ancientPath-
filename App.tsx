import React, { useState, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';
import { About } from './pages/About';
import { ThemeContextType, AuthContextType, User, UserRole, BlogPost, Category } from './types';
import { INITIAL_POSTS, INITIAL_CATEGORIES } from './services/mockData';

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

const App: React.FC = () => {
  // Theme State
  const [isDark, setIsDark] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Data State
  const [posts, setPosts] = useState<BlogPost[]>(INITIAL_POSTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  // Initialize Theme
  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isSystemDark);
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const login = (username: string, role: UserRole) => {
    setUser({
      id: Date.now().toString(),
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

  const addCategory = (name: string, parentId: string | null) => {
    const newCat: Category = {
        id: `c${Date.now()}`,
        name,
        parentId
    };
    setCategories([...categories, newCat]);
  };

  const deleteCategory = (id: string) => {
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

    // Update posts associated with this category to have no category (or handle as 'Uncategorized' in UI)
    if (affectedPostsCount > 0) {
        setPosts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: '' } : p));
    }
    
    setCategories(prev => {
      // Filter out the category to delete
      const filtered = prev.filter(c => c.id !== id);
      // Update any children of this category to have no parent (top-level)
      return filtered.map(c => c.parentId === id ? { ...c, parentId: null } : c);
    });
  };

  const updatePost = (updatedPost: BlogPost) => {
      setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AuthContext.Provider value={{ 
        user, 
        login, 
        logout, 
        isAuthenticated: !!user,
        isAdmin: user?.role === UserRole.ADMIN
      }}>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home posts={posts} categories={categories} />} />
              <Route path="/about" element={<About />} />
              <Route path="/post/:id" element={<PostDetail posts={posts} updatePost={updatePost} categories={categories} />} />
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
                  />
                } 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;