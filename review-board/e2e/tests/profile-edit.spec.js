import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.js';

// @smoke：プロフィール bio 編集。avatar アップは flaky の元で別 issue 化。
test.describe('profile edit @smoke', () => {
  test('自分のプロフィール bio を編集できる', async ({ page }) => {
    await loginAs(page, 'student');

    // ヘッダのアバターから自プロフィールへ。
    await page.locator('header a[href^="/users/"]').first().click();
    await expect(page).toHaveURL(/\/users\/\d+\/profile/);

    // 編集モードを開く（実装はモーダル：ProfilePage.jsx の ProfileEditModal）。
    await page.getByRole('button', { name: 'プロフィール編集' }).click();
    const newBio = `E2E 編集テスト ${Date.now()}`;
    // モーダル内 textarea は <label htmlFor="profile-bio"> で取れる。
    const bioTextarea = page.getByLabel('自己紹介');
    await bioTextarea.fill(newBio);
    await page.getByRole('button', { name: '保存' }).click();

    // モーダル閉じる → プロフィール本文に bio が反映される。
    await expect(page.locator('main')).toContainText(newBio, { timeout: 10_000 });
  });
});
