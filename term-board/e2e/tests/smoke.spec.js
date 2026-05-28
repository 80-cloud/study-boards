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

  test('ブラウザの戻るボタンでアプリ内の前のビューに戻る（#387）', async ({ page }) => {
    await page.goto('/');
    // 初回ロードで #home が付くこと（基準点）。
    await expect.poll(() => page.url()).toContain('#home');
    // ホーム→4択クイズ→用語辞典 と遷移し、hashが順に変わる。
    await page.getByRole('button', { name: '覚える', exact: true }).click();
    await expect.poll(() => page.url()).toContain('#quiz');
    await page.getByRole('button', { name: '用語辞典', exact: true }).click();
    await expect.poll(() => page.url()).toContain('#dictionary');
    // 戻るで quiz へ。
    await page.goBack();
    await expect.poll(() => page.url()).toContain('#quiz');
    await expect(page.getByRole('heading', { name: /の意味は/ })).toBeVisible();
    // さらに戻ると home。アプリ外には出ない（真っ暗にならない）。
    await page.goBack();
    await expect.poll(() => page.url()).toContain('#home');
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

  test('マイ問題：面接Q&Aを登録→編集して保存できる（#389）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'マイ問題', exact: true }).click();
    // 1件登録
    await page.getByLabel('分野・場面 *').fill('志望動機');
    await page.getByLabel('質問 *').fill('なぜITを志望？');
    await page.getByLabel('模範回答 *').fill('前職の効率化体験から');
    await page.getByRole('button', { name: '追加する' }).click();
    // 登録された項目の編集ボタンを押す
    await page.getByRole('button', { name: /「なぜITを志望？」を編集/ }).click();
    // 編集中バナーが出てフィールドが prefill されている
    await expect(page.getByText(/編集中：なぜITを志望/)).toBeVisible();
    await expect(page.getByLabel('質問 *')).toHaveValue('なぜITを志望？');
    // 質問を更新して保存
    await page.getByLabel('質問 *').fill('なぜIT業界を志望されたのですか？');
    await page.getByRole('button', { name: '更新する' }).click();
    // 一覧に更新後の値が出ている
    await expect(page.getByText('なぜIT業界を志望されたのですか？')).toBeVisible();
    // 登録件数は1件のまま（編集は新規追加にならない）
    await expect(page.getByText(/登録した面接Q&A（1件）/)).toBeVisible();
    // 後始末：削除しておく
    await page.getByRole('button', { name: /を削除/ }).click();
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
