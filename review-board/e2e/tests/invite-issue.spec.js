import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.js';

// @smoke：講師が招待コードを発行 → 一覧で「失効させる」で REVOKED 化。
// 受講生が招待コードで登録 → ログインまで通すフルフローは別 spec（時間がかかる）。
test.describe('invite issue @smoke', () => {
  test('講師が招待リンクを発行して失効できる', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/invites');
    await expect(page.getByRole('heading', { name: /受講生を招待|招待/ }).first()).toBeVisible();

    // 発行：上限 5 名・有効 3 日。
    await page.getByLabel('利用上限（人数）').fill('5');
    await page.getByLabel('有効日数').fill('3');
    await page.getByRole('button', { name: '招待リンクを発行' }).click();

    // 発行直後に表示される共有リンク欄に register?code= が含まれる。
    const linkInput = page.locator('input[aria-label="招待リンク"]');
    await expect(linkInput).toBeVisible({ timeout: 10_000 });
    const link = await linkInput.inputValue();
    expect(link).toMatch(/\/register\?code=/);

    // 一覧の先頭行を失効させる（確認ダイアログなし）。
    await page.getByRole('button', { name: '失効させる' }).first().click();
    // 失効ボタンが消える or「失効済み」表示が出る。
    await expect(page.getByText(/失効済み/).first()).toBeVisible({ timeout: 10_000 });
  });
});
