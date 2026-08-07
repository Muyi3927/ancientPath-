import React, { useEffect, useState } from 'react';
import { Download, Smartphone, CheckCircle, Shield, Zap, History, WifiOff, AlertTriangle, Play, RefreshCw, Layers } from 'lucide-react';

export const DownloadApp: React.FC = () => {
  useEffect(() => {
    console.log("DownloadApp page mounted");
  }, []);

  const screenshots = [
    "https://media.ancientpath.dpdns.org/images/1769596553630-1.webp",
    "https://media.ancientpath.dpdns.org/images/1769596558873-2.webp",
    "https://media.ancientpath.dpdns.org/images/1769596564787-3.webp",
    "https://media.ancientpath.dpdns.org/images/1769596570279-4.webp",
    "https://media.ancientpath.dpdns.org/images/1769596575852-5.webp",
    "https://media.ancientpath.dpdns.org/images/1769596581935-6.webp",
    "https://media.ancientpath.dpdns.org/images/1769596587601-7.webp",
    "https://media.ancientpath.dpdns.org/images/1769597211484-10.webp",
    "https://media.ancientpath.dpdns.org/images/1769596593747-8.webp",
    "https://media.ancientpath.dpdns.org/images/1769596597694-9.webp"
  ];

  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center mb-16 space-y-6">
        <span className="inline-block py-1 px-3 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
          全新发布 v1.0
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-text-primary dark:text-[#f5ece0] tracking-tight font-serif">
          访问古道 App
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
          基于现代 <span className="text-text-primary dark:text-[#f5ece0] font-semibold">Expo</span> 架构重构，
          为您提供原生级的流畅交互与极致的阅读体验。
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a 
              href="https://media.ancientpath.dpdns.org/app/application-b3b6fa33-be59-4acc-9d30-51ec8fdb8752.apk" 
              download
              className="group relative flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-10 rounded-2xl transition-all transform hover:scale-[1.02] shadow-xl shadow-primary-600/30 w-full sm:w-auto"
            >
              <Download className="w-6 h-6 mr-3 transition-transform group-hover:-translate-y-1" />
              <div className="text-left">
                <div className="text-xs opacity-90 font-medium tracking-wide">Android APK</div>
                <div className="text-lg leading-none">立即下载</div>
              </div>
            </a>
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4">
              支持 Android 8.0+
            </p>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        <FeatureCard 
            icon={<Zap className="w-6 h-6 text-amber-500" />}
            title="原生极速体验"
            description="采用 React Native 与 Expo 顶层架构，告别网页套壳的卡顿。启动速度提升 300%，滑动如丝般顺滑。"
        />
        <FeatureCard 
            icon={<WifiOff className="w-6 h-6 text-primary-500" />}
            title="智能离线阅读"
            description="自动缓存您浏览过的文章与经文。无论是在飞行模式还是弱网环境，真理的喂养从不间断。"
        />
        <FeatureCard 
            icon={<Play className="w-6 h-6 text-pink-500" />}
            title="沉浸式音频"
            description="全新设计的悬浮播放器，支持全局后台播放、锁屏控制。听道与阅读可同时进行，互不干扰。"
        />
        <FeatureCard 
            icon={<RefreshCw className="w-6 h-6 text-green-500" />}
            title="无感热更新"
            description="引入 OTA (Over-the-Air) 技术，新功能上线与 Bug 修复无需重新下载安装包，打开 App 即可享受最新体验。"
        />
        <FeatureCard 
            icon={<Layers className="w-6 h-6 text-indigo-500" />}
            title="专注无干扰"
            description="移除浏览器地址栏与系统状态栏的视觉噪音，提供更纯粹、更宽阔的阅读视野。"
        />
      </div>

      {/* App Screenshots Gallery */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-center text-text-primary dark:text-[#f5ece0] mb-10 font-serif">
          界面概览
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {screenshots.map((src, index) => (
                <div 
                    key={index} 
                    className={`group relative aspect-[9/19.5] rounded-xl overflow-hidden shadow-lg border-4 border-slate-100 dark:border-slate-800 bg-slate-200 dark:bg-slate-700 cursor-pointer transition-transform hover:-translate-y-2 lg:last:hidden xl:last:block`}
                    onClick={() => setActiveScreenshot(src)}
                >
                    <img 
                        src={src} 
                        alt={`App Screenshot ${index + 1}`} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
            ))}
        </div>
        <p className="text-center text-slate-500 mt-6 text-sm">点击图片查看大图（受限于服务器，加载可能稍慢）</p>
      </div>

      {/* Image Lightbox Modal */}
      {activeScreenshot && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setActiveScreenshot(null)}
        >
            <img 
                src={activeScreenshot} 
                alt="Full Preview" 
                className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            />
            <button 
                className="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                onClick={() => setActiveScreenshot(null)}
            >
                <div className="sr-only">Close</div>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      )}

      {/* Security & Trust Section (Re-styled) */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <h2 className="text-2xl font-bold text-text-primary dark:text-[#f5ece0] mb-8 flex items-center relative z-10">
          <Shield className="w-8 h-8 text-green-600 mr-3" />
          安全声明与安装指引
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 relative z-10">
            {/* Virus Check Info */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl border border-green-100 dark:border-green-900/30 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg text-text-primary dark:text-[#f5ece0] mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    安全无毒
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                     APK 安装包已通过 <span className="font-semibold text-text-primary dark:text-[#f5ece0]">VirusTotal</span> 全球 65 款主流杀毒引擎的严格检测，您可以点击查看 <a href="https://www.virustotal.com/gui/file/e070eadfa7669eec7220b3f9b37e9b8ae56769d46a8120253e05f0b20c36e409?nocache=1" target="_blank" rel="noreferrer" className="text-primary-600 underline font-medium">完整检测报告</a>。
                </p>
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <Shield className="w-3 h-3 mr-1.5 text-slate-400" />
                    应用仅申请 联网 和 音频播放 基础权限。
                </div>
            </div>

            {/* Installation Help */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl border border-primary-100 dark:border-primary-900/30 shadow-sm hover:shadow-md transition-shadow">
                 <h3 className="font-bold text-lg text-text-primary dark:text-[#f5ece0] mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                    遇到"风险提示"怎么办？
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                    弟兄姊妹，由于众所周知的原因，访问古道 app 未能上架应用市场，安装时系统可能会提示 "未知来源"。
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 mr-2"></span>
                        <span>若提示<span className="font-bold text-slate-700 dark:text-slate-300">"未知来源"</span>：请在安装时点击“允许安装”。</span>
                    </li>
                    <li className="flex items-start">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 mr-2"></span>
                        <span>如果仍有顾虑，您完全可以继续使用网页版。App 仅提供额外的离线缓存和更佳的阅读体验。</span>
                    </li>
                    <li className="flex items-start">
                         <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 mr-2"></span>
                         <span><span className="font-bold text-slate-700 dark:text-slate-300">强烈推荐PWA模式</span>：我们已开发了 PWA (渐进式 Web 应用) 支持，您可以在浏览器中选择<span className="font-bold text-slate-700 dark:text-slate-300">"添加到桌面"</span>。这样既可以直接在桌面打开，也没有浏览器地址栏干扰，体验非常接近原生 App。</span>
                    </li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-start p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
    <div className="flex-shrink-0 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mr-5 text-primary-600 dark:text-primary-400">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-bold text-text-primary dark:text-[#f5ece0] mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  </div>
);
