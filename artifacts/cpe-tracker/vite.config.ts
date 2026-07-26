import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const port = Number(process.env.PORT ?? '5173');
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

// Default to "/" locally; Replit sets BASE_PATH to the artifact's preview path
const basePath = process.env.BASE_PATH ?? '/';

// Proxy /api to the API server when running locally (no-op on Replit where the
// reverse proxy handles routing)
const apiTarget = process.env.API_URL ?? 'http://localhost:3001';
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Only load Replit-specific plugins inside a Repl
    ...(isReplit
      ? [
          runtimeErrorOverlay(),
          ...(process.env.NODE_ENV !== 'production'
            ? [
                await import('@replit/vite-plugin-cartographer').then((m) =>
                  m.cartographer({
                    root: path.resolve(import.meta.dirname, '..'),
                  }),
                ),
                await import('@replit/vite-plugin-dev-banner').then((m) =>
                  m.devBanner(),
                ),
              ]
            : []),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // Forward /api requests to the API server when running locally
    proxy: isReplit
      ? undefined
      : {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
          },
        },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
