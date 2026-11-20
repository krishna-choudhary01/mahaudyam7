import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { handleApiRequest } from './server/index.js';

function mahaUdyamApiPlugin() {
  return {
    name: 'mahaudyam-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const pathname = rawUrl.split('?')[0];
        if (pathname.startsWith('/api/') || pathname === '/api') {
          try {
            const handled = await handleApiRequest(req, res);
            if (!handled) next();
          } catch (err) {
            console.error('[Vite API Middleware Error]:', err);
            next(err);
          }
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0) for cross-device & mobile access
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true
      }
    }
  },
  plugins: [
    mahaUdyamApiPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'MahaUdyam - Rural Entrepreneur Opportunity Platform',
        short_name: 'MahaUdyam',
        description: 'Offline-first opportunity and market intelligence platform for rural entrepreneurs in Maharashtra',
        theme_color: '#1b5e20',
        background_color: '#f4f6f4',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB to allow comprehensive statewide 716-market master dataset
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'document' ||
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'maha-udyam-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              }
            }
          }
        ]
      }
    })
  ]
});
