import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy API calls back to the local backend so we only need one tunnel.
      // Client should call `/api/*` (set VITE_API_BASE_URL=/api).
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
      // Allow ngrok host headers during local testing.
      // This prevents "Blocked request ... is not allowed" errors.
      // Vite expects `string[] | true` for this option.
      allowedHosts: ['.ngrok-free.app'],
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    // Ensure SPA routing works - fallback to index.html for all routes
    appType: 'spa',
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
  };
});

