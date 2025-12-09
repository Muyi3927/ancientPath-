import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../services/api';

interface Track {
  uri: string;
  title: string;
  postId: number;
  author?: string;
  coverImage?: string;
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  playTrack: (track: Track) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  closePlayer: () => Promise<void>;
  sound: Audio.Sound | null;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        sound?.setPositionAsync(0);
      }
    } else if (status.error) {
      console.error(`Player Error: ${status.error}`);
    }
  };

  const playTrack = async (track: Track) => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      
      // If playing the same track, just toggle
      if (currentTrack?.uri === track.uri && sound) {
        await togglePlay();
        return;
      }

      // Unload existing sound
      if (sound) {
        await sound.unloadAsync();
      }

      const fullUri = track.uri.startsWith('http') ? track.uri : `${API_BASE_URL}${track.uri}`;
      
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: fullUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentTrack(track);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('播放失败', '无法播放此音频');
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const seekTo = async (pos: number) => {
    if (sound) {
      await sound.setPositionAsync(pos);
    }
  };

  const closePlayer = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  };

  return (
    <AudioContext.Provider value={{
      currentTrack,
      isPlaying,
      isLoading,
      position,
      duration,
      playTrack,
      togglePlay,
      seekTo,
      closePlayer,
      sound
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
