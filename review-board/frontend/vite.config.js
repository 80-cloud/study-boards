/// <reference types="vitest" />
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // 計測対象（テストの届きやすい範囲）。pages 全体まで広げると現実値が下がるため段階導入。
      include: [
        'src/components/EmptyState.jsx',
        'src/components/ErrorBoundary.jsx',
        'src/components/MarkdownText.jsx',
        'src/components/ProtectedRoute.jsx',
        'src/components/ReviewPrefBadges.jsx',
        'src/hooks/useDraft.js',
        'src/pages/NotFoundPage.jsx',
      ],
      // 床（最低保証）。引き継ぎ書 #7 の現実値を採用し、四半期で 5% ずつ引き上げる方針。
      // functions が他より低いのは MarkdownText の HTML 要素 renderer（h1〜td 等）が
      // テスト経路で呼ばれない構造のため。実値（57%）に余裕を持たせて 50% を床にする。
      thresholds: {
        lines: 75,
        branches: 65,
        functions: 50,
        statements: 75,
      },
    },
  },
});
