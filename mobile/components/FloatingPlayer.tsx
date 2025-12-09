import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated, PanResponder, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAudio } from '../context/AudioContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import MusicNoteIcon from '@/components/ui/MusicNoteIcon';

export default function FloatingPlayer() {
  const { currentTrack, isPlaying, togglePlay, closePlayer } = useAudio();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const widthAnim = useRef(new Animated.Value(50)).current; // Start collapsed (width 50)
  const opacityAnim = useRef(new Animated.Value(0)).current; // Content opacity
  const rotateAnim = useRef(new Animated.Value(0)).current; // Rotation for icon
  
  // Draggable state
  const pan = useRef(new Animated.ValueXY()).current;
  const panOffset = useRef({ x: 0, y: 0 }); // Track total offset manually
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const bottomBase = Platform.OS === 'ios' ? 90 : 70;

  const panResponder = useMemo(() => 
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only drag if moved more than 5 pixels
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: panOffset.current.x,
          y: panOffset.current.y
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        const currentWidth = isExpanded ? 300 : 50;
        
        // Calculate bounds
        // X axis (positive is right)
        // Initial right: 16. 
        // Max movement right (positive): 16 (to touch right edge)
        // Max movement left (negative): screenWidth - 16 - currentWidth
        const maxDx = 16;
        const minDx = -(screenWidth - 16 - currentWidth);

        // Y axis (positive is down)
        // Initial bottom: bottomBase
        // Max movement down (positive): bottomBase
        // Max movement up (negative): screenHeight - bottomBase - 50
        const maxDy = bottomBase;
        const minDy = -(screenHeight - bottomBase - 50);

        // Calculate proposed total translation
        let totalX = panOffset.current.x + gestureState.dx;
        let totalY = panOffset.current.y + gestureState.dy;

        // Clamp
        if (totalX > maxDx) totalX = maxDx;
        if (totalX < minDx) totalX = minDx;
        if (totalY > maxDy) totalY = maxDy;
        if (totalY < minDy) totalY = minDy;

        // Set new value (delta from offset)
        pan.setValue({
          x: totalX - panOffset.current.x,
          y: totalY - panOffset.current.y
        });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        // Update our manual offset tracker
        // After flattenOffset, the value contains the total offset
        panOffset.current = {
            x: (pan.x as any)._value,
            y: (pan.y as any)._value
        };
      }
    }),
    [isExpanded, screenWidth, screenHeight]
  );

  // Auto-collapse timer
  const collapseTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      startRotation();
    } else {
      stopRotation();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (currentTrack) {
        // Reset to collapsed state when track changes, or keep current state?
        // Let's keep it collapsed by default or respect user interaction.
        // But if it's a new track, maybe show it briefly?
        // For now, let's just ensure it's visible.
    }
  }, [currentTrack]);

  const startRotation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRotation = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const expand = () => {
    setIsExpanded(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: 300, // Target width (approx full width - margins)
        duration: 300,
        useNativeDriver: false, // Width cannot use native driver
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    resetCollapseTimer();
  };

  const collapse = () => {
    setIsExpanded(false);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();

    if (collapseTimer.current) clearTimeout(collapseTimer.current);
  };

  const resetCollapseTimer = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      collapse();
    }, 5000); // Auto collapse after 5 seconds of inactivity
  };

  const handlePress = () => {
    if (!isExpanded) {
      expand();
    } else {
      // If already expanded, navigate to post
      router.push(`/post/${currentTrack?.postId}`);
    }
  };

  const handleTogglePlay = async () => {
    resetCollapseTimer();
    await togglePlay();
  };

  if (!currentTrack) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      className="absolute bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex-row items-center overflow-hidden z-50"
      style={{ 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        bottom: Platform.OS === 'ios' ? 90 : 70,
        right: 16, // Initial position
        width: widthAnim,
        height: 50,
        transform: [
            { translateX: pan.x },
            { translateY: pan.y }
        ]
      }}
    >
      {/* Collapsed Icon (Always visible on the left side of the container) */}
      <TouchableOpacity 
        onPress={handlePress} 
        className="absolute left-0 top-0 bottom-0 w-[50px] items-center justify-center z-10"
      >
        {isExpanded ? (
             <MusicNoteIcon width={24} height={24} color="#2563eb" />
        ) : (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                {currentTrack.coverImage ? (
                <Image 
                    source={{ uri: currentTrack.coverImage }} 
                    className="w-8 h-8 rounded-full" 
                    contentFit="cover"
                    transition={500}
                />
                ) : (
                <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center">
                    <MusicNoteIcon width={16} height={16} color="#2563eb" />
                </View>
                )}
            </Animated.View>
        )}
      </TouchableOpacity>

      {/* Expanded Content */}
      <Animated.View 
        className="flex-1 flex-row items-center pl-[50px] pr-2"
        style={{ opacity: opacityAnim }}
      >
        <TouchableOpacity 
            className="flex-1 mr-2" 
            onPress={() => router.push(`/post/${currentTrack.postId}`)}
        >
            <Text className="text-sm font-bold text-gray-900 dark:text-white" numberOfLines={1}>
                {currentTrack.title}
            </Text>
        </TouchableOpacity>

        <View className="flex-row items-center space-x-1">
            <TouchableOpacity onPress={handleTogglePlay} className="p-2">
            <IconSymbol 
                name={isPlaying ? "pause.fill" : "play.fill"} 
                size={20} 
                color="#2563eb" 
            />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { closePlayer(); collapse(); }} className="p-2">
            <IconSymbol name="xmark" size={16} color="#9ca3af" />
            </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
