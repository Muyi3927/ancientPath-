import React, { useState } from 'react';
import { BookOpen, Shield, Feather, Anchor, Users, Droplet, Wine, X, ChevronRight, Scroll, Heart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aboutContent } from './AboutData';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  content: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export const About: React.FC = () => {
  const [modalData, setModalData] = useState<{title: string, subtitle?: string, content: string} | null>(null);

  const openModal = (title: string, content: string, subtitle?: string) => {
    setModalData({ title, content, subtitle });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20 px-4 sm:px-6">
      {/* Modal */}
      <Modal 
        isOpen={!!modalData} 
        onClose={() => setModalData(null)} 
        title={modalData?.title || ''} 
        subtitle={modalData?.subtitle}
        content={modalData?.content || ''} 
      />

      {/* Header */}
      <div className="text-center space-y-8 py-12">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">关于访问古道</h1>
        
        <div className="max-w-3xl mx-auto">
            <blockquote className="text-lg md:text-xl italic text-slate-600 dark:text-slate-300 border-l-4 border-primary-500 pl-6 py-4 my-8 font-serif bg-slate-50 dark:bg-slate-900/50 rounded-r-xl text-left shadow-sm leading-relaxed">
                "耶和华如此说：你们当站在路上察看，访问古道，哪是善道，便行在其中，这样你们心里必得安息。"
                <footer className="text-sm font-sans text-slate-400 mt-3 not-italic font-medium">— 耶利米书 6:16</footer>
            </blockquote>
        </div>
        
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed font-light">
            {aboutContent.intro}
        </p>
      </div>

      {/* Creeds Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">我们认信</h2>
                <p className="text-slate-500 dark:text-slate-400">We Confess</p>
            </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
            {/* Universal Creeds */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <Anchor className="w-6 h-6 text-primary-600" />
                    <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">普世信经</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    {aboutContent.creeds.intro}
                </p>
                <div className="space-y-3">
                    {aboutContent.creeds.universal.map((creed, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => openModal(creed.title, creed.content, creed.subtitle)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent hover:border-primary-200 dark:hover:border-slate-600 hover:shadow-md transition-all text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{creed.title}</h4>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">{creed.subtitle}</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Three Forms of Unity */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center gap-3 mb-6">
                    <Feather className="w-6 h-6 text-primary-600" />
                    <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">三项联合信条</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    作为欧陆改革宗信仰的传承者，我们特别是通过三项联合信条来教导和牧养。
                </p>
                <div className="space-y-4">
                    {aboutContent.creeds.reformed.map((creed, idx) => (
                        <button 
                            key={idx}
                            onClick={() => openModal(creed.title, creed.content, creed.subtitle)}
                            className="w-full flex items-center justify-between p-4 bg-amber-50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-amber-200 dark:hover:border-slate-600 transition-all text-left group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{creed.title}</h4>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">{creed.subtitle}</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Church Order Section */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl relative">
        <div className="absolute top-0 right-0 p-12 opacity-10">
            <Scroll className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 p-8 md:p-12 text-white">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Scroll className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-serif font-bold">{aboutContent.churchOrder.title}</h2>
            </div>
            <div className="max-w-3xl">
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                    {aboutContent.churchOrder.intro}
                </p>
                <button 
                    onClick={() => openModal(aboutContent.churchOrder.title, aboutContent.churchOrder.content)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-slate-100 transition-colors"
                >
                    阅读历史背景
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Offices Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">教会职分</h2>
                <p className="text-slate-500 dark:text-slate-400">Church Offices</p>
            </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
            {aboutContent.offices.map((office, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        {idx === 0 ? <Users className="w-6 h-6 text-slate-600 dark:text-slate-300" /> : 
                         idx === 1 ? <Shield className="w-6 h-6 text-slate-600 dark:text-slate-300" /> : 
                         <Heart className="w-6 h-6 text-slate-600 dark:text-slate-300" />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{office.title}</h3>
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">{office.role}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 flex-grow line-clamp-3">
                        {office.content.split('\n')[2] || "点击查看详细职分描述与圣经依据。"}
                    </p>
                    <button 
                        onClick={() => openModal(office.title, office.content, office.role)}
                        className="w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium"
                    >
                        了解更多
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Sacraments Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Droplet className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">圣礼</h2>
                <p className="text-slate-500 dark:text-slate-400">Sacraments</p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            {aboutContent.sacraments.map((sacrament, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-lg border border-slate-100 dark:border-slate-800">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        {idx === 0 ? <Droplet className="w-32 h-32" /> : <Wine className="w-32 h-32" />}
                    </div>
                    <div className="p-8 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
                            {idx === 0 ? <Droplet className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Wine className="w-6 h-6 text-red-600 dark:text-red-400" />}
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">{sacrament.title}</h3>
                        <p className="text-slate-500 uppercase text-sm tracking-wider mb-6">{sacrament.subtitle}</p>
                        <button 
                            onClick={() => openModal(sacrament.title, sacrament.content, sacrament.subtitle)}
                            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold hover:gap-3 transition-all"
                        >
                            阅读教义详情
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};