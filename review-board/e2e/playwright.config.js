import { defineConfig, devices } from '@playwright/test';

// review-board E2E 設定。
// - baseURL はフロント（Vite 5175）。/api は Vite プロキシ経由で backend(8082) に届く。
// - smoke は chromium-desktop のみ（PR 自動）。full/a11y/mobile は手動スコープ（workflow_dispatch）。
// - webServer は「起動済みなら再利用、無ければ起動」。ローカルは稼働中のフロントを再利用し、
//   CI ではワークフローが backend を起動した後に Playwright がフロントを立ち上げる。
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5175';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],

  webServer: {
    command: 'npm run dev',
    cwd: '../frontend',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
