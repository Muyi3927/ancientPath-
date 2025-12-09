import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width, height } = Dimensions.get('window');

export default function AppSplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Show for 2.5 seconds, then fade out
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image 
            source={require('../assets/images/icon1.png')} 
            style={styles.logo}
            contentFit="contain"
        />
      </View>

      {/* Scripture Section */}
      <View style={styles.footer}>
        <Text style={styles.scriptureText}>
          耶和华如此说：你们当站在路上察看，{'\n'}
          访问古道，哪是善道，便行在其中，{'\n'}
          这样你们心里必得安息。
        </Text>
        <Text style={styles.reference}>(耶利米书 6:16)</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff', // Match app.json splash background
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 280,
    height: 280,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb', // Royal Blue
    letterSpacing: 2,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scriptureText: {
    fontSize: 16,
    color: '#64748b', // Slate 500
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'serif', // Use serif for scripture
    marginBottom: 12,
  },
  reference: {
    fontSize: 14,
    color: '#94a3b8', // Slate 400
    fontWeight: '500',
  },
});
