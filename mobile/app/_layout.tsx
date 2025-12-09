import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AudioProvider } from '../context/AudioContext';
import FloatingPlayer from '../components/FloatingPlayer';
import AppSplashScreen from '../components/AppSplashScreen';

// Prevent the native splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAppReady, setIsAppReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // await Font.loadAsync(Entypo.font);
        
        // Artificially delay for a moment to ensure layout is ready? 
        // Or just let the custom splash handle the timing.
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setIsAppReady(true);
        // Hide the native splash screen immediately, so our custom one takes over
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isAppReady) {
    return null;
  }

  return (
    <AudioProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {showCustomSplash && (
            <AppSplashScreen onFinish={() => setShowCustomSplash(false)} />
        )}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ headerShown: true }} />
        </Stack>
        <FloatingPlayer />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AudioProvider>
  );
}
