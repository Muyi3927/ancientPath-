import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit3, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Draft {
  title: string;
  content: string;
  excerpt: string;
  categoryId?: number;
  currentTags: string[];
  coverImage: string;
  audioUrl: string;
  isFeatured: boolean;
  timestamp: number;
}

export const Drafts: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('admin_drafts');
    if (saved) {
      try {
        setDrafts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse drafts", e);
      }
    }
  }, []);

  const handleDelete = (index: number) => {
    if (!window.confirm("确定删除此草稿吗？")) return;
    const newDrafts = drafts.filter((_, i) => i !== index);
    setDrafts(newDrafts);
    localStorage.setItem('admin_drafts', JSON.stringify(newDrafts));
  };

  const handleUseDraft = (draft: Draft) => {
    // Navigate to editor with state
    navigate('/editor', { state: { draft } });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold font-serif">草稿箱 (本地存储)</h1>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p>暂无草稿</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft, index) => (
            <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-grow min-w-0 mr-4">
                <h3 className="font-bold text-lg mb-1 truncate">{draft.title || '(无标题)'}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                   <Calendar className="w-3 h-3" />
                   {format(draft.timestamp, 'yyyy年M月d日 HH:mm')}
                   <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600">
                      {draft.content.length} 字
                   </span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-1">
                    {draft.excerpt || draft.content.substring(0, 50)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                    onClick={() => handleUseDraft(draft)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 hover:bg-primary-100 rounded-lg text-sm font-bold transition-colors"
                >
                    <Edit3 className="w-4 h-4" /> 编辑
                </button>
                <button 
                    onClick={() => handleDelete(index)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
