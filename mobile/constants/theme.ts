/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#e36208';
const tintColorDark = '#f59e38';

export const Colors = {
  light: {
    text: '#3d2e1f',
    background: '#fdfaf5',
    tint: tintColorLight,
    icon: '#6d5c4a',
    tabIconDefault: '#a08e7a',
    tabIconSelected: tintColorLight,
    surface: '#ffffff',
    surfaceAlt: '#faf8f5',
    border: '#e8ddd0',
    borderLight: '#f0e8dc',
    textSecondary: '#6d5c4a',
    textMuted: '#a08e7a',
  },
  dark: {
    text: '#f5ece0',
    background: '#1e1a14',
    tint: tintColorDark,
    icon: '#a89880',
    tabIconDefault: '#a89880',
    tabIconSelected: tintColorDark,
    surface: '#252018',
    surfaceAlt: '#1a1610',
    border: '#4a3f30',
    borderLight: '#302820',
    textSecondary: '#d4c4b0',
    textMuted: '#a89880',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
