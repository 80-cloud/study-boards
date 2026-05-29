import { LoginPage, USERS } from '../pages/LoginPage.js';

// 各 spec で書き直していたログイン手順を共通化する。
// POM は既存の LoginPage を使いまわす（個別ロケータの真実の単一ソース）。
export async function loginAs(page, who) {
  const user = USERS[who];
  if (!user) {
    throw new Error(`未登録のテストユーザ: ${who}`);
  }
  const login = new LoginPage(page);
  await login.goto();
  await login.login(user.email, user.password);
}

// ヘッダーの「ログアウト」ボタンを押し、/login へ遷移するまで待つ。
export async function logout(page) {
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await page.waitForURL('**/login');
}
