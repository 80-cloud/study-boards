import { defineConfig, devices } from '@playwright/test';

// term-board E2E 設定。
// - サーバー無しの静的SPA（React+Vite）。backend/DB は無く、Vite dev だけを起動する。
// - dev は base パス（/hideharu-AI/term-board/）で配信され、root(/) は 302 で base へ誘導される。
//   baseURL は origin のみとし、各テストは goto('/') でリダイレクトを追従する。
// - smoke / a11y はどちらも chromium-desktop で PR 自動実行（外部依存が無く安定）。
const ORIGIN = process.env.E2E_BASE_URL || 'http://localhost:5176';
const APP_URL = `${ORIGIN}/hideharu-AI/term-board/`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: ORIGIN,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
