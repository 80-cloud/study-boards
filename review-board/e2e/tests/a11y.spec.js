import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LoginPage, USERS } from '../pages/LoginPage.js';

// @a11y：WCAG 監査（P-9）。手動スコープ（workflow_dispatch）で実行。
// smoke ゲートを不安定にしないため、致命的（critical）違反のみを失敗条件とし、
// serious 以下はレポートに記録する（装飾モックは aria-hidden 済みで axe の対象外）。
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  const serious = results.violations.filter((v) => v.impact === 'serious');
  // serious は可視化のためログに残す（落とさない）。
  if (serious.length) {
    console.log('a11y serious violations:', serious.map((v) => `${v.id} (${v.nodes.length})`).join(', '));
  }
  return { critical, serious, all: results.violations };
}

test.describe('accessibility @a11y', () => {
  test('ログイン画面に critical な a11y 違反が無い', async ({ page }) => {
    await page.goto('/login');
    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('トップ（認証後）に critical な a11y 違反が無い', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(USERS.student.email, USERS.student.password);
    await expect(page.getByRole('heading', { name: /エンジニアを育てる/ })).toBeVisible();

    const { critical } = await scan(page);
    expect(critical, critical.map((v) => v.id).join(', ')).toEqual([]);
  });
});
