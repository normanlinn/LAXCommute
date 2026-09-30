import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'test' ? [] : [cloudflare()]),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'favicon.svg',
      ],
      manifest: {
        id: '/',
        name: 'LAXCommute',
        short_name: 'LAXCommute',
        description: 'Your LAX employee shuttle, boarding stops, and commute in one place.',
        theme_color: '#122b32',
        background_color: '#f5f7f6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // No runtime caching: live arrivals, auth, and Apple map data stay online-only.
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'], restoreMocks: true },
}));
