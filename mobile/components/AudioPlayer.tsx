import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '../services/api';
import { useAudio } from '../context/AudioContext';
import { useLocalSearchParams } from 'expo-router';

interface AudioPlayerProps {
  uri: string;
  title?: string;
}

export default function AudioPlayer({ uri, title = 'Audio' }: AudioPlayerProps) {
  const { id } = useLocalSearchParams();
  const postId = Number(id);
  
  const { 
    currentTrack, 
    isPlaying: isGlobalPlaying, 
    isLoading: isGlobalLoading, 
    position: globalPosition, 
    duration: globalDuration, 
    playTrack, 
    togglePlay, 
    seekTo,
    sound
  } = useAudio();

  const [rate, setRate] = useState(1.0);
  const [isPending, setIsPending] = useState(false);

  // Ensure URI is absolute
  const fullUri = uri.startsWith('http') ? uri : `${API_BASE_URL}${uri}`;

  // Check if this player is the active one
  const isCurrentTrack = currentTrack?.uri === uri || currentTrack?.uri === fullUri;
  
  // Local display state
  const isPlaying = isCurrentTrack ? isGlobalPlaying : false;
  const isLoading = isCurrentTrack ? isGlobalLoading : false;
  const position = isCurrentTrack ? globalPosition : 0;
  const duration = isCurrentTrack ? globalDuration : 0;

  const handlePlayPress = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      if (isCurrentTrack) {
        await togglePlay();
      } else {
        await playTrack({
          uri: fullUri,
          title,
          postId,
          author: '讲道音频' // You might want to pass author prop if available
        });
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleSeek = async (value: number) => {
    if (isCurrentTrack) {
      await seekTo(value);
    }
  };

  const changeSpeed = async () => {
    if (!sound || !isCurrentTrack) return;
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const nextRateIndex = (rates.indexOf(rate) + 1) % rates.length;
    const newRate = rates[nextRateIndex];
    setRate(newRate);
    await sound.setRateAsync(newRate, true);
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg my-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</Text>
        <View className="flex-row items-center">
            <TouchableOpacity onPress={changeSpeed} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded" disabled={!isCurrentTrack}>
                <Text className="text-xs font-bold text-gray-700 dark:text-gray-300">{rate}x</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity onPress={handlePlayPress} disabled={isLoading || isPending}>
          {isLoading || isPending ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <IconSymbol 
              name={isPlaying ? "pause.circle.fill" : "play.circle.fill"} 
              size={48} 
              color="#2563eb" 
            />
          )}
        </TouchableOpacity>
        
        <View className="flex-1 ml-4">
          <Slider
            style={{width: '100%', height: 40}}
            minimumValue={0}
            maximumValue={duration || 1} // Prevent division by zero or invalid max
            value={position}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#2563eb"
            maximumTrackTintColor="#9ca3af"
            thumbTintColor="#2563eb"
            disabled={!isCurrentTrack}
          />
          <View className="flex-row justify-between -mt-1">
            <Text className="text-xs text-gray-500 dark:text-gray-400">{formatTime(position)}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">{formatTime(duration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
