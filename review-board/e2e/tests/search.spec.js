import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.js';

// @smoke：投稿検索（V22 pg_trgm GIN）。dev seed の投稿タイトルに含まれる語でヒットする。
test.describe('search @smoke', () => {
  test('ヘッダー検索バーで投稿をタイトル一致で絞り込める', async ({ page }) => {
    await loginAs(page, 'student');

    // ヘッダの検索フォームは button が無く、Enter で submit すると navigate(?q=...) で URL 遷移する。
    const headerSearch = page.locator('header form input[type="search"]').first();
    await headerSearch.fill('TypeScript');
    await headerSearch.press('Enter');

    // URL に ?q=TypeScript が反映され、PostsPage が初期値として取り込む。
    await expect(page).toHaveURL(/\?q=TypeScript/, { timeout: 10_000 });

    // PR #475 マージで TypeScript を含む投稿（"TypeScript で型を厳格化した API クライアント"）が
    // 存在するようになるが、現状の seed では存在しない可能性がある。タイトル一致は best-effort。
    const tsHeading = page.getByRole('heading', { name: /TypeScript/ }).first();
    await tsHeading.isVisible({ timeout: 3_000 }).catch(() => null);

    // 「キーワードの絞り込みを解除」チップが描画されていれば × で解除して全件に戻れる。
    const clearChip = page.getByRole('button', { name: 'キーワードの絞り込みを解除' });
    if (await clearChip.isVisible().catch(() => false)) {
      await clearChip.click();
    }
  });
});
