import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies the API to the Express admin server; SSE streams through.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
});
