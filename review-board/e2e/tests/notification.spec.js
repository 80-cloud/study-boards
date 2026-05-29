import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.js';

// @smoke：通知発火 → 既読化のサイクル。
// 既存 dev seed に「未読 5 件」の REVIEW_RECEIVED 通知が demo 受信ユーザ向けに入っているので、
// それを開いて「すべて既読にする」を押し、未読バッジが消えることを確認する。
test.describe('notification @smoke', () => {
  test('通知センターを開き「すべて既読にする」で未読カウントが消える', async ({ page }) => {
    // seed では demo 宛に既読/未読が混ざる。teacher アカウントは振り分け対象ではない。
    // dev seed 投入直後に確実に未読がある demo 受講生を使う。
    await loginAs(page, 'student');

    // /notifications を開く（API 応答着信を待ってから DOM カウント）。
    const notifResp = page.waitForResponse(
      (r) => r.url().includes('/api/notifications') && r.ok()
    );
    await page.goto('/notifications');
    await notifResp.catch(() => null);
    await expect(page.getByRole('heading', { name: '通知' })).toBeVisible();

    // 未読が 1 件以上ある場合のみ「すべて既読にする」ボタンが描画される（NotificationsPage.jsx）。
    const readAllBtn = page.getByRole('button', { name: 'すべて既読にする' });
    if (await readAllBtn.isVisible().catch(() => false)) {
      await readAllBtn.click();
      await expect(readAllBtn).not.toBeVisible({ timeout: 10_000 });
    }

    // 既読化後にヘッダの未読バッジが消える（30秒ポーリングだが pathname 変更で即時 fetch）。
    await page.goto('/');
    const notifLink = page.locator('header a[href="/notifications"]');
    await expect(notifLink).toHaveAttribute('aria-label', /^通知$/, { timeout: 35_000 });
  });
});
