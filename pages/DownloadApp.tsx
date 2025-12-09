import React, { useEffect } from 'react';
import { Download, Smartphone, CheckCircle, Shield, Zap, History, WifiOff } from 'lucide-react';

export const DownloadApp: React.FC = () => {
  useEffect(() => {
    console.log("DownloadApp page mounted");
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 font-serif">
          下载访问古道 App
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          更流畅的阅读体验，更强大的离线功能。
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-8 md:p-12 flex flex-col items-center justify-center">
          <div className="grid md:grid-cols-2 gap-8 mb-10 w-full">
            <FeatureItem 
              icon={<Zap className="w-6 h-6 text-amber-500" />}
              title="极致流畅"
              description="原生应用开发，带来丝滑般的滑动和加载体验，远超网页版。"
            />
            <FeatureItem 
              icon={<WifiOff className="w-6 h-6 text-blue-600" />}
              title="离线缓存"
              description="自动缓存已读文章和经文，没有网络也能随时随地阅读。"
            />
            <FeatureItem 
              icon={<History className="w-6 h-6 text-green-600" />}
              title="阅读历史"
              description="自动记录您的阅读进度和历史，方便随时回顾。"
            />
            <FeatureItem 
              icon={<Shield className="w-6 h-6 text-purple-600" />}
              title="沉浸体验"
              description="无浏览器地址栏干扰，提供更纯粹、专注的属灵阅读环境。"
            />
          </div>

          <div className="space-y-4 w-full max-w-md">
            <a 
              href="https://media.ancientpath.dpdns.org/app/app-release.apk" 
              download
              className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-600/20"
            >
              <Download className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="text-xs opacity-80 font-normal">Android APK</div>
                <div className="text-lg leading-none">立即下载</div>
              </div>
            </a>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              适用于 Android 8.0 及以上版本
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-start p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
    <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-800 rounded-lg mr-4 shadow-sm">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  </div>
);
