import React, { useContext, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, PenTool, LogOut, Search, Menu, X, BookOpen } from 'lucide-react';
import { ThemeContext, AuthContext } from '../App';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout, isAuthenticated, isAdmin } = useContext(AuthContext);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-900 dark:bg-slate-100 rounded-lg flex items-center justify-center text-white dark:text-slate-900 shadow-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex flex-col -space-y-1">
                   <span className="font-serif font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">访问古道</span>
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest">Ask for the Ancient Paths</span>
                </div>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className={`${isActive('/') ? 'text-primary-600 font-bold' : 'hover:text-primary-500 font-medium'} transition-colors`}>
                首页
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

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-4">
               <button onClick={toggleTheme} className="p-2">
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-4">
             <form onSubmit={handleSearch} className="relative w-full">
                <input 
                  type="text" 
                  placeholder="搜索..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </form>
              <div className="flex flex-col gap-2 divide-y divide-slate-100 dark:divide-slate-800">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-3 text-lg font-medium">首页</Link>
                <Link to="/about" onClick={() => setIsMenuOpen(false)} className="py-3 text-lg font-medium">关于我们</Link>
                {isAuthenticated && isAdmin && (
                   <Link to="/editor" onClick={() => setIsMenuOpen(false)} className="py-3 text-lg font-medium text-primary-600">撰写文章</Link>
                )}
                {isAuthenticated && (
                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="py-3 text-lg font-medium text-left text-red-500">退出登录</button>
                )}
              </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
             <BookOpen className="w-6 h-6 text-slate-400" />
             <span className="font-serif font-bold text-xl text-slate-700 dark:text-slate-300">访问古道</span>
          </div>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            耶和华如此说：你们当站在路上察看，访问古道，哪是善道，便行在其中，这样你们心里必得安息。
            <br/><span className="italic">- 耶利米书 6:16</span>
          </p>
          {/* Hidden Login Trigger */}
          <div 
            className="mt-8 text-xs text-slate-400 cursor-text select-none"
            onClick={handleHiddenLoginClick}
          >
            &copy; {new Date().getFullYear()} 访问古道 (Ancient Paths). Soli Deo Gloria.
          </div>
        </div>
      </footer>
    </div>
  );
};