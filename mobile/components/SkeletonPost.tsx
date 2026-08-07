import React, { useEffect, useRef } from 'react';
import { View, Animated, useColorScheme } from 'react-native';

export function SkeletonPost() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const bgClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <View className={`mx-4 mb-4 p-4 rounded-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-sm border`}>
      {/* Image Skeleton */}
      <Animated.View className={`w-full h-48 rounded-xl mb-4 ${bgClass}`} style={{ opacity }} />
      
      {/* Title Skeleton */}
      <Animated.View className={`w-3/4 h-6 rounded-md mb-3 ${bgClass}`} style={{ opacity }} />
      
      {/* Excerpt Skeleton */}
      <Animated.View className={`w-full h-4 rounded-md mb-2 ${bgClass}`} style={{ opacity }} />
      <Animated.View className={`w-full h-4 rounded-md mb-2 ${bgClass}`} style={{ opacity }} />
      <Animated.View className={`w-2/3 h-4 rounded-md mb-4 ${bgClass}`} style={{ opacity }} />
      
      {/* Tags Skeleton */}
      <View className="flex-row mb-4">
        <Animated.View className={`w-16 h-6 rounded-md mr-2 ${bgClass}`} style={{ opacity }} />
        <Animated.View className={`w-20 h-6 rounded-md ${bgClass}`} style={{ opacity }} />
      </View>
      
      {/* Footer Skeleton */}
      <View className="flex-row justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800">
        <Animated.View className={`w-24 h-4 rounded-md ${bgClass}`} style={{ opacity }} />
        <Animated.View className={`w-16 h-4 rounded-md ${bgClass}`} style={{ opacity }} />
      </View>
    </View>
  );
}
