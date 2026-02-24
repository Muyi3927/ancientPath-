import React, { useEffect } from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';
import { preloadData } from '../services/api';

interface SmartLinkProps extends LinkProps {
  preload?: boolean; // 是否预加载目标页面的数据
  prefetch?: boolean; // 是否预获取页面资源
}

export const SmartLink: React.FC<SmartLinkProps> = ({ 
  preload = false, 
  prefetch = false, 
  to, 
  onMouseEnter,
  ...props 
}) => {
  useEffect(() => {
    // 如果启用预获取，在组件挂载时预获取资源
    if (prefetch && typeof to === 'string') {
      // 预获取页面HTML/JS/CSS
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = to;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [prefetch, to]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 鼠标悬停时预加载数据
    if (preload) {
      preloadData();
    }
    
    // 调用原有的onMouseEnter处理函数
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  return (
    <RouterLink
      to={to}
      onMouseEnter={handleMouseEnter}
      {...props}
    />
  );
};

// 为常见的导航链接提供预设配置
export const NavLink: React.FC<Omit<SmartLinkProps, 'preload' | 'prefetch'>> = (props) => (
  <SmartLink preload={true} prefetch={true} {...props} />
);

export const ContentLink: React.FC<Omit<SmartLinkProps, 'preload'>> = (props) => (
  <SmartLink preload={true} {...props} />
);