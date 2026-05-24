import { test, expect } from '@playwright/test';
import { LoginPage, USERS } from '../pages/LoginPage.js';

// @smoke：PR で自動実行する主要導線（login → トップ → 成果物詳細 → 成長記録）。
// 受講生どうしの相互レビューが主役のため、まず受講生でログインして閲覧導線を担保する。
test.describe('smoke @smoke', () => {
  test('受講生でログインしてトップが表示される', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(USERS.student.email, USERS.student.password);

    // ランディングのヒーロー見出しが見える＝認証後トップに到達。
    await expect(page.getByRole('heading', { name: /エンジニアを育てる/ })).toBeVisible();
  });

  test('成果物を投稿して詳細が表示される', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(USERS.student.email, USERS.student.password);

    const title = `E2E投稿 ${Date.now()}`;
    await page.goto('/posts/new');
    // タイトル（必須 input）・説明（必須 textarea）を入力して投稿。
    // ヘッダーの検索フォームを避けるため main 内の投稿フォームにスコープする。
    await page.locator('main form input').first().fill(title);
    await page.locator('main form textarea').first().fill('E2E smoke の自動投稿です。');
    await page.getByRole('button', { name: '投稿する' }).click();

    // 投稿成功で詳細へ遷移し、タイトルが見える。
    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByRole('link', { name: /一覧へ/ })).toBeVisible();
  });

  test('成長記録（プロフィール）が表示される', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(USERS.student.email, USERS.student.password);

    // ヘッダーのアバターから自分の成長記録へ。
    await page.locator('header a[href^="/users/"]').first().click();
    await expect(page).toHaveURL(/\/users\/\d+\/profile/);
    await expect(page.getByText('継続の記録')).toBeVisible();
    await expect(page.getByText('投稿した成果物')).toBeVisible();
  });
});
