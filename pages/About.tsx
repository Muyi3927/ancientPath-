import React from 'react';
import { BookOpen, Shield, Feather, Anchor } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <BookOpen className="w-10 h-10 text-slate-700 dark:text-slate-200" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">关于访问古道</h1>
        <div className="max-w-2xl mx-auto">
            <blockquote className="text-xl italic text-slate-600 dark:text-slate-300 border-l-4 border-primary-500 pl-4 py-2 my-6 font-serif bg-slate-50 dark:bg-slate-900/50 rounded-r-lg">
                "耶和华如此说：你们当站在路上察看，访问古道，哪是善道，便行在其中，这样你们心里必得安息。"
                <footer className="text-sm font-sans text-slate-400 mt-2 not-italic">— 耶利米书 6:16</footer>
            </blockquote>
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            我们致力于传承欧陆改革宗信仰（Continental Reformed Faith），回归圣经，高举上帝的主权与恩典。
            在这个即时满足的时代，我们邀请您一同放慢脚步，重回古旧福音的根基，以此牧养生命，建造教会。
        </p>
      </div>

      {/* Creeds Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-900 text-white p-8 md:p-12 text-center relative overflow-hidden">
             <Shield className="w-32 h-32 text-slate-800 absolute -top-6 -left-6 opacity-50" />
             <h2 className="text-3xl font-serif font-bold relative z-10 mb-2">我们认信</h2>
             <p className="text-slate-400 relative z-10">We Confess</p>
        </div>
        
        <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12">
            {/* Universal Creeds */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Anchor className="w-6 h-6 text-primary-600" />
                    <h3 className="text-2xl font-serif font-bold">普世信经</h3>
                </div>
                <p className="text-slate-500 text-sm mb-4">
                    我们与历代普世教会共同持守三大信经，确认三位一体上帝的基要真理。
                </p>
                <ul className="space-y-4">
                    <li className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2"></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">使徒信经</h4>
                            <span className="text-xs text-slate-500 uppercase">Apostles' Creed</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2"></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">尼西亚信经</h4>
                            <span className="text-xs text-slate-500 uppercase">Nicene Creed</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2"></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">亚他那修信经</h4>
                            <span className="text-xs text-slate-500 uppercase">Athanasian Creed</span>
                        </div>
                    </li>
                </ul>
            </div>

            {/* Three Forms of Unity */}
            <div className="space-y-6">
                 <div className="flex items-center gap-3 mb-6">
                    <Feather className="w-6 h-6 text-primary-600" />
                    <h3 className="text-2xl font-serif font-bold">三项联合信条</h3>
                </div>
                <p className="text-slate-500 text-sm mb-4">
                    作为改革宗信仰的传承者，我们特别是通过三项联合信条来教导和牧养。
                </p>
                <ul className="space-y-4">
                    <li className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">比利时信条</h4>
                            <span className="text-xs text-slate-500 uppercase">Belgic Confession (1561)</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">海德堡要理问答</h4>
                            <span className="text-xs text-slate-500 uppercase">Heidelberg Catechism (1563)</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">多特信经</h4>
                            <span className="text-xs text-slate-500 uppercase">Canons of Dort (1619)</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};