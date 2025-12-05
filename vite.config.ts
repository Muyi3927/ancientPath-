import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['logo.svg'],
      manifest: {
        name: '访问古道 | Ancient Paths',
        short_name: 'AncientPaths',
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
  }
});