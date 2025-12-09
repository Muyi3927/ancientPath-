import React, { useContext, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, PenTool, LogOut, Search, Menu, X, BookOpen, Home, LayoutGrid, User, Download } from 'lucide-react';
import { ThemeContext, AuthContext, LayoutContext } from '../App';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout, isAuthenticated, isAdmin } = useContext(AuthContext);
  const { isMenuVisible } = useContext(LayoutContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Hidden Login Logic
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHiddenLoginClick = () => {
    if (isAuthenticated) return;

    setClickCount(prev => prev + 1);
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 2000); // Reset count if not clicked 3 times within 2 seconds

    if (clickCount + 1 >= 3) {
      navigate('/login');
      setClickCount(0);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const isFullWidthPage = ['/bible', '/categories'].includes(location.pathname);
  const isBiblePage = location.pathname === '/bible';

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans overflow-hidden">
      {/* Navbar */}
      <nav className={`flex-none z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 print:hidden transition-all duration-500 ease-in-out ${isBiblePage ? 'fixed top-0 left-0 right-0' : 'sticky top-0'} ${isMenuVisible ? 'translate-y-0' : `-translate-y-full ${!isBiblePage ? '-mb-16' : ''}`}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center gap-3">
                <img src="/logo.svg" alt="Logo" className="w-9 h-9 rounded-lg shadow-lg" />
                <div className="flex flex-col -space-y-1">
                   <span className="font-serif font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">访问古道</span>
                   <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ask for the Ancient Paths</span>
                </div>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className={`${isActive('/') ? 'text-primary-600 font-bold' : 'hover:text-primary-500 font-medium'} transition-colors`}>
                首页
              </Link>
              <Link to="/bible" className={`${isActive('/bible') ? 'text-primary-600 font-bold' : 'hover:text-primary-500 font-medium'} transition-colors`}>
                圣经
              </Link>
              <Link to="/categories" className={`${isActive('/categories') ? 'text-primary-600 font-bold' : 'hover:text-primary-500 font-medium'} transition-colors`}>
                分类
              </Link>
              <Link to="/app" className={`${isActive('/app') ? 'text-primary-600 font-bold' : 'hover:text-primary-500 font-medium'} transition-colors`}>
                下载App
              </Link>
              <Link to="/about" className={`${isActive('/about') ? 'text-primary-600 font-bold' : 'hover:text-primary-500 font-medium'} transition-colors`}>
                关于我们
              </Link>
              
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  placeholder="搜索布道、文章..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm w-48 transition-all focus:w-64 border border-transparent focus:border-primary-500"
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              </form>
            </div>

            {/* Right Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              {isAuthenticated && (
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <Link to="/editor" className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-lg">
                      <PenTool className="w-4 h-4" />
                      撰写
                    </Link>
                  )}
                  <div className="flex items-center gap-2">
                    <img src={user?.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                    <button onClick={logout} title="退出登录">
                       <LogOut className="w-5 h-5 text-slate-500 hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>
              )}
              {/* Removed Public Login Button */}
            </div>

            {/* Mobile menu button - Removed in favor of Bottom Nav */}
            <div className="md:hidden flex items-center gap-4">
               <button onClick={toggleTheme} className="p-2">
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Removed */}
      </nav>

      {/* Content Wrapper */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full relative">
        <main className={isFullWidthPage ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-0'}>
          {children}
        </main>

        {/* Footer */}
        {!isFullWidthPage && (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 print:hidden pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div 
              className="text-xs text-slate-400 cursor-text select-none"
              onClick={handleHiddenLoginClick}
            >
              &copy; {new Date().getFullYear()} 访问古道 (Ancient Paths). 唯独荣耀归于神.
            </div>
          </div>
        </footer>
        )}
      </div>

      {/* Bottom Nav for Mobile */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 flex justify-around items-center h-16 z-50 pb-safe transition-transform duration-500 ease-in-out ${isMenuVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] mt-1">首页</span>
        </Link>
        <Link to="/bible" className={`flex flex-col items-center p-2 ${isActive('/bible') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] mt-1">圣经</span>
        </Link>
        <Link to="/categories" className={`flex flex-col items-center p-2 ${isActive('/categories') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] mt-1">分类</span>
        </Link>
        <Link to="/app" className={`flex flex-col items-center p-2 ${isActive('/app') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <Download className="w-6 h-6" />
          <span className="text-[10px] mt-1">下载</span>
        </Link>
        <Link to="/about" className={`flex flex-col items-center p-2 ${isActive('/about') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <User className="w-6 h-6" />
          <span className="text-[10px] mt-1">关于</span>
        </Link>
      </div>
    </div>
  );
};