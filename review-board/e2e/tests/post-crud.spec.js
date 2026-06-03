import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.js';

// @smoke：成果物の create → update → delete を 1 本でカバー。
// 並列実行で他テストと衝突しないようタイトルにタイムスタンプを入れる。
test.describe('post crud @smoke', () => {
  test('投稿 → 編集 → 削除', async ({ page }) => {
    await loginAs(page, 'student');

    // create
    const title = `E2E CRUD ${Date.now()}`;
    await page.goto('/posts/new');
    await page.locator('main form input').first().fill(title);
    await page
      .locator('main form textarea')
      .first()
      .fill('post-crud spec が作る投稿。編集と削除の対象。');
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page).toHaveURL(/\/posts\/\d+/);
    const postUrl = page.url();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // update
    await page.goto(`${postUrl}/edit`);
    const editedTitle = `${title} (edited)`;
    await page.locator('main form input').first().fill(editedTitle);
    await page.getByRole('button', { name: /保存|更新/ }).click();
    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.getByRole('heading', { name: editedTitle })).toBeVisible();

    // delete：#498 で ConfirmDialog 化。削除ボタン → 確認ダイアログ「削除する」を踏む。
    await page.getByRole('button', { name: '削除', exact: true }).click();
    await page.getByRole('button', { name: '削除する' }).click();
    // 削除成功 → /posts/:id から離脱（トップ or 一覧へ遷移）。
    await page.waitForURL((url) => !url.pathname.match(/\/posts\/\d+$/), { timeout: 10_000 });
    // 遷移先のページに編集後タイトルが残っていない＝削除が反映されている。
    await expect(page.getByRole('heading', { name: editedTitle })).toHaveCount(0);
  });
});
