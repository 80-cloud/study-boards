// ログイン画面のページオブジェクト。認証は HttpOnly Cookie（POST /api/auth/login）。
export class LoginPage {
  constructor(page) {
    this.page = page;
    this.email = page.locator('#email');
    this.password = page.locator('#password');
    this.submit = page.getByRole('button', { name: 'ログイン' });
    this.error = page.locator('text=メールアドレスまたはパスワードが違います');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await Promise.all([
      this.page.waitForURL('**/'), // 成功時はトップへ replace 遷移
      this.submit.click(),
    ]);
  }
}

// seed ユーザー（SEED_PASSWORD）。本番資格情報ではなくローカル/CI 専用。
export const USERS = {
  student: { email: 'student@example.com', password: process.env.E2E_PASSWORD || 'devpass12345' },
  teacher: { email: 'teacher@example.com', password: process.env.E2E_PASSWORD || 'devpass12345' },
};
