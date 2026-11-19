import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.png',
        'apple-touch-icon.png',
        'mask-icon.svg',
        'statutes/*.pdf',
      ],
      manifest: {
        id: '/',
        name: 'SeeraAI Pro - Elite Courtroom Assistant',
        short_name: 'SeeraAI',
        description: 'Elite Master System for Ethiopian Legal Research & Courtroom Assistance',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0f172a',
        background_color: '#020617',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Allow precaching the ~4 MB Telegram archive master JSON once during SW install
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2}',
          'telegram-archive-master.json',
        ],
        globIgnores: [
          '**/assets/aistudio/**',
          '**/*.zip',
          'sw.js',
          'workbox-*.js',
        ],
        runtimeCaching: [
          {
            // Stale-While-Revalidate for the live Telegram legal feed endpoints
            urlPattern: /\/api\/telegram\/(live-legal-feed|channel-feed|poll-news)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'telegram-live-feed-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache-First for paginated archive API queries (master JSON itself is precached once above)
            urlPattern: /\/api\/telegram\/archive-1500(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'telegram-archive-api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/t\.me\/seeraai_ethio\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'telegram-archive-cache',
              expiration: {
                maxEntries: 1500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/statutes\/.*\.pdf$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'statutory-docs-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'lucide-react',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    hmr: false,
  },
  preview: {
    host: '0.0.0.0',
  },
});
