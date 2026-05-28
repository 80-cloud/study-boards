import { test, expect } from '@playwright/test';

// @smoke：PR で自動実行する主要導線。
// 認証もサーバーも無いので、ホーム表示→4グループへの到達→4択を1問解く、を担保する。
test.describe('smoke @smoke', () => {
  test('ホームが表示され、4グループ・各モードへ到達できる', async ({ page }) => {
    await page.goto('/');

    // ヒーロー見出し（h2）＝ホーム到達。
    await expect(page.getByRole('heading', { name: /面接で言える/ })).toBeVisible();

    // グループ「覚える」→ 第2段にモードが現れ、4択クイズへ遷移する。
    await page.getByRole('button', { name: '覚える', exact: true }).click();
    await expect(page.getByRole('button', { name: '4択クイズ', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '用語辞典', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /の意味は/ })).toBeVisible();

    // グループ「面接対策」→ 面接練習が初期表示（模範回答ボタン）。
    await page.getByRole('button', { name: '面接対策', exact: true }).click();
    await expect(page.getByRole('button', { name: '模擬面接', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /模範回答を見る/ })).toBeVisible();

    // グループ「学ぶ・記録」→ 第2段にダッシュボード等。
    await page.getByRole('button', { name: '学ぶ・記録', exact: true }).click();
    await expect(page.getByRole('button', { name: 'ダッシュボード', exact: true })).toBeVisible();

    // グループ「マイ問題」（単独）へ。
    await page.getByRole('button', { name: 'マイ問題', exact: true }).click();

    // アプリ名クリックでホームへ戻る。
    await page.getByRole('button', { name: /ホームへ戻る/ }).click();
    await expect(page.getByRole('heading', { name: /面接で言える/ })).toBeVisible();
  });

  test('PCナビをサイドバーに切替でき、サイドバーから遷移できる', async ({ page }) => {
    await page.goto('/');
    // desktop の様式トグルでサイドバーへ。
    await page.getByRole('button', { name: /サイドバーに切り替え/ }).click();
    // サイドバー（モード一覧）から用語辞典へ。
    const side = page.getByRole('navigation', { name: 'モード一覧' });
    await expect(side).toBeVisible();
    await side.getByRole('button', { name: '用語辞典', exact: true }).click();
    await expect(page.getByPlaceholder('用語・意味で検索')).toBeVisible();
    // 上部ツールバーへ戻せる。
    await page.getByRole('button', { name: /上部ツールバーに切り替え/ }).click();
    await expect(side).toBeHidden();
  });

  test('4択クイズを1問解ける（採点と解説が出る）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '覚える', exact: true }).click();

    await expect(page.getByRole('heading', { name: /の意味は/ })).toBeVisible();

    // 出題セクション（aria-live="polite"）内の選択肢ボタンの先頭を回答。
    const options = page.locator('section[aria-live="polite"] ul button');
    await expect(options.first()).toBeVisible();
    await options.first().click();

    // 採点結果と「次の問題」が現れる。
    await expect(page.getByText(/正解！|不正解/)).toBeVisible();
    await expect(page.getByRole('button', { name: /次の問題/ })).toBeVisible();
  });
});
