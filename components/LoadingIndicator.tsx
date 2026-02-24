import React, { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  show: boolean;
  delay?: number;
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  show, 
  delay = 200, 
  message = '加载中...' 
}) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (show) {
      timeout = setTimeout(() => setShouldShow(true), delay);
    } else {
      setShouldShow(false);
    }

    return () => clearTimeout(timeout);
  }, [show, delay]);

  if (!shouldShow) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-2 flex items-center space-x-2 border border-gray-200 dark:border-gray-700">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
      <span className="text-sm text-gray-600 dark:text-gray-300">{message}</span>
    </div>
  );
};

// 简化的加载指示器，用于页面角落
export const MiniLoadingIndicator: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 z-50 w-6 h-6 bg-blue-500 rounded-full animate-pulse opacity-70"></div>
  );
};

// 页面级加载覆盖
export const PageLoadingOverlay: React.FC<{ 
  show: boolean; 
  message?: string;
  allowInteraction?: boolean;
}> = ({ 
  show, 
  message = '正在加载...', 
  allowInteraction = false 
}) => {
  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-40 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm transition-opacity ${
        allowInteraction ? 'pointer-events-none' : ''
      }`}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};