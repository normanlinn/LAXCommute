import { feedCaching } from './scripts/feed-cache.mjs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    {
      name: 'search-console-verification',
      transformIndexHtml() {
        const token = loadEnv(mode, process.cwd(), 'VITE_').VITE_GOOGLE_SITE_VERIFICATION;
        return token
          ? [
              {
                tag: 'meta',
                attrs: { name: 'google-site-verification', content: token },
                injectTo: 'head',
              },
            ]
          : [];
      },
    },
    react(),
    tailwindcss(),
    ...(mode === 'test' ? [] : [cloudflare()]),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/apple-touch-v2.png',
        'icons/commute-v2-192.png',
        'icons/commute-v2-512.png',
        'icons/favicon-v2.png',
        'icons/maskable-512.png',
        'social-preview.png',
      ],
      manifest: {
        id: '/',
        name: 'LAXCommute',
        short_name: 'LAXCommute',
        description: 'Your LAX employee shuttle, boarding stops, and commute in one place.',
        theme_color: '#081923',
        background_color: '#f7fbfc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/commute-v2-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/commute-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        // Precache the primary map engine so routes can render offline.
        globIgnores: ['**/assets/{AppleMap,simpleBasemap,maplibre-gl-worker}-*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Cache public feed snapshots only. Auth and third-party map tiles are never cached here.
        runtimeCaching: [
          ...feedCaching,
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /^\/assets\/(FreeMap|AppleMap|simpleBasemap|maplibre-gl-worker)-/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'optional-map-assets',
              expiration: { maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              [
                'api.fontshare.com',
                'cdn.fontshare.com',
                'fonts.googleapis.com',
                'fonts.gstatic.com',
              ].includes(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'laxcommute-brand-fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'], restoreMocks: true },
}));
