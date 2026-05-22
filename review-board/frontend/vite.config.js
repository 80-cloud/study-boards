import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// review-board フロントエンド。ポートは要件定義書のローカルポートに従い 5175 固定。
// /api は backend(8082) にプロキシ（CORS は backend が 5175 のみ許可・整合）。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
});
