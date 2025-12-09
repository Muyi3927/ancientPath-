import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { UserRole } from '../types';
import { Lock, User, ArrowRight } from 'lucide-react';
import { loginUser } from '../services/api';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username !== 'admin') {
        alert('用户名错误');
        return;
    }

    try {
       const result = await loginUser(password);
       if (result.success && result.token) {
          // 存储 Token 到 localStorage，供 api.ts 使用
          localStorage.setItem('authToken', result.token);
          login('Admin', UserRole.ADMIN);
          navigate('/');
       } else {
          alert('认证失败。密码错误。');
       }
    } catch (error) {
       console.error(error);
       alert('登录过程中发生错误');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-white mb-2">
              管理员登录
          </h2>
          <p className="text-slate-500 text-sm">
             访问古道后台管理
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                    用户名
                </label>
                <div className="relative">
                <input 
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="admin"
                />
                <User className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                    密码
                </label>
                <div className="relative">
                    <input 
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        placeholder="••••••••"
                    />
                    <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                </div>
            </div>

            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                登录 <ArrowRight className="w-4 h-4" />
            </button>
        </form>
      </div>
    </div>
  );
};