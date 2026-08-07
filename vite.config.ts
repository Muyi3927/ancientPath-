import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/]
      },
      devOptions: {
        enabled: false
      },
      includeAssets: ['logo.svg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: '访问古道 | 传承欧陆改革宗信仰',
        short_name: '访问古道',
        description: '一个传承欧陆改革宗信仰的博客平台',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  define: {
    // Ensure process.env is available for the API Key usage in geminiService.ts
    'process.env': process.env
  },
  server: {
    watch: {
      ignored: [
        '**/backups/**',
        '**/CosyVoice/**',
        '**/mobile/**',
        '**/outputs/**',
        '**/lumina-blog-media/**',
        '**/lumina-blog-media-optimized/**',
        '**/dev-dist/**'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  }
});