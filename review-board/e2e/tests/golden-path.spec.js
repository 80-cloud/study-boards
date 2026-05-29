import { test, expect } from '@playwright/test';
import { LoginPage, USERS } from '../pages/LoginPage.js';

// @smoke @golden：本アプリの主役である「受講生が投稿 → 別ユーザー（講師）がレビュー
// → 投稿者に通知が届く」相互作用ループを 1 本でカバーする。
// 既存 smoke は受講生 1 人の閲覧導線に閉じており、コア体験が E2E で守られていなかった。
// 並列実行で seed データを汚さないように、タイトルにタイムスタンプを含める。
test.describe('golden path @smoke @golden', () => {
  test('投稿→他ユーザーのレビュー→投稿者への通知が届く', async ({ browser }) => {
    // ---- 1) 受講生で投稿 ----
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    const studentLogin = new LoginPage(studentPage);
    await studentLogin.goto();
    await studentLogin.login(USERS.student.email, USERS.student.password);

    // 投稿前の通知件数を /notifications 直接で測る（ヘッダーバッジは 30s ポーリング
    // のため E2E で待つと遅い・不安定）。NotificationsPage はマウント時に再取得する。
    // 通知 API レスポンス着信を待ってから数える（SPA 描画前にカウントすると 0 で誤判定）。
    const notifResp1 = studentPage.waitForResponse((r) => r.url().includes('/api/notifications') && r.ok());
    await studentPage.goto('/notifications');
    await notifResp1;
    await expect(studentPage.getByRole('heading', { name: '通知' })).toBeVisible();
    const beforeCount = await studentPage.locator('main ul > li').count();

    const title = `Golden path 投稿 ${Date.now()}`;
    await studentPage.goto('/posts/new');
    await studentPage.locator('main form input').first().fill(title);
    await studentPage
      .locator('main form textarea')
      .first()
      .fill('Golden path：別ユーザーがレビューを書くと投稿者に通知が届くことを実機で守る。');
    await studentPage.getByRole('button', { name: '投稿する' }).click();
    await expect(studentPage).toHaveURL(/\/posts\/\d+/);

    const postUrl = studentPage.url();
    const postId = postUrl.match(/\/posts\/(\d+)/)?.[1];
    expect(postId, '投稿の ID を URL から取り出せる').toBeTruthy();

    // ---- 2) 講師でログインし、その投稿にレビューを書く ----
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    const teacherLogin = new LoginPage(teacherPage);
    await teacherLogin.goto();
    await teacherLogin.login(USERS.teacher.email, USERS.teacher.password);

    await teacherPage.goto(`/posts/${postId}`);
    await expect(teacherPage.getByRole('heading', { name: title })).toBeVisible();

    await teacherPage.getByLabel(/良かった点/).fill('観点が明確で読みやすい。');
    await teacherPage.getByLabel(/もっと良くなる点/).fill('テストの観点を 1 行足すと完璧。');
    await teacherPage.getByRole('button', { name: 'レビューを投稿' }).click();

    // レビューが本投稿に積まれたことを画面で確認（API 直叩きでなく実画面で守る）。
    await expect(teacherPage.getByText('観点が明確で読みやすい。')).toBeVisible();

    // ---- 3) 受講生コンテキストで通知の増分を確認 ----
    // /notifications を開き直し、件数が投稿前より増えていることを実画面で守る
    // （API 直叩きでなく投稿者から見える表示で検証）。
    await expect.poll(
      async () => {
        const resp = studentPage.waitForResponse((r) => r.url().includes('/api/notifications') && r.ok());
        await studentPage.goto('/notifications');
        await resp.catch(() => null);
        await studentPage.getByRole('heading', { name: '通知' }).waitFor({ timeout: 5_000 });
        return studentPage.locator('main ul > li').count();
      },
      { message: '通知一覧の件数が投稿前より増えている', timeout: 20_000, intervals: [1000, 2000, 3000] }
    ).toBeGreaterThan(beforeCount);

    await studentContext.close();
    await teacherContext.close();
  });
});
