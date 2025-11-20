// src/pages/PostDetail.tsx  （覆盖原来的）
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BlogPost } from '../types';
import { AuthContext } from '../App';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { api } from '../api'; // ← 确保你用了我们之前改好的 api
import { ArrowLeft, Edit, Share2, Volume2, Type, Minus, Plus, Gauge } from 'lucide-react';

export const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const fontClasses = ['prose-lg', 'prose-xl', 'prose-2xl'];

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await api.getPost(id!);
        setPost(data);
      } catch (err) {
        console.error("文章不存在或加载失败", err);
        navigate('/'); // 不存在就回首页
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPost();
  }, [id, navigate]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("链接已复制！");
    });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(e.target.value);
    }
  };

  const increaseFont = () => setFontSizeLevel(prev => Math.min(prev + 1, 2));
  const decreaseFont = () => setFontSizeLevel(prev => Math.max(prev - 1, 0));

  if (loading) {
    return <div className="flex justify-center py-20">加载中...</div>;
  }

  if (!post) {
    return <div className="text-center py-20 text-slate-500">文章不存在</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center mb-8">
        <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> 返回列表
        </Link>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link to={`/editor/${post.id}`} className="btn-primary flex items-center gap-2">
              <Edit className="w-4 h-4" /> 编辑
            </Link>
          )}
          
          {/* 字体调节 */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-full border p-1">
            <button onClick={decreaseFont} disabled={fontSizeLevel === 0} className="p-2"><Minus className="w-4 h-4"/></button>
            <span className="px-2 text-xs">{fontSizeLevel + 1}</span>
            <button onClick={increaseFont} disabled={fontSizeLevel === 2} className="p-2"><Plus className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      <article className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden">
        {/* 封面 */}
        {post.coverImage && (
          <div className="relative h-96">
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-8 left-8 text-white">
              <h1 className="text-4xl md:text-6xl font-bold font-serif">{post.title}</h1>
              <p className="text-lg mt-2 opacity-90">
                {format(post.createdAt, 'yyyy年M月d日')} · {post.author.username}
              </p>
            </div>
          </div>
        )}

        <div className="p-8 md:p-12">
          {/* 音频播放器 */}
          {post.audioUrl && (
            <div className="mb-12 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center gap-2 font-bold text-lg">
                  <Volume2 className="w-5 h-5" /> 收听音频
                </h3>
                <select onChange={handleSpeedChange} defaultValue="1" className="text-sm border rounded px-3 py-1">
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
              <audio ref={audioRef} controls className="w-full" src={post.audioUrl}>
                您的浏览器不支持音频。
              </audio>
            </div>
          )}

          {/* 正文 */}
          <div className={`${fontClasses[fontSizeLevel]} transition-all`}>
            <MarkdownRenderer content={post.content} />
          </div>

          {/* 分享按钮 */}
          <div className="mt-12 text-center">
            <button onClick={handleShare} className="inline-flex items-center gap-2 btn-secondary">
              <Share2 className="w-5 h-5" /> 分享这篇文章
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};
