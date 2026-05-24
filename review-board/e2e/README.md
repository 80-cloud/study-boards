# review-board E2E（Playwright）

主要導線の E2E と WCAG 監査（P-9）。PR で smoke を自動実行し、full / a11y / mobile は手動スコープ。

## 構成
- `playwright.config.js` … baseURL=フロント(5175)。`webServer` で Vite を起動（稼働中なら再利用）。
- `pages/` … ページオブジェクト（`LoginPage`・seed ユーザー）。
- `tests/smoke.spec.js` … `@smoke`：login → 投稿 → 詳細 → 成長記録。
- `tests/a11y.spec.js` … `@a11y`：axe による WCAG 監査（critical を失敗条件、serious はログ）。

## ローカル実行
事前に backend(8082)・MinIO(9002)・Postgres(5434) を起動し、`SEED_PASSWORD` でユーザーをシードしておく。

```bash
cd review-board/e2e
npm install
npx playwright install chromium webkit
npm run e2e:smoke     # PR 相当（Chromium）
npm run e2e:a11y      # WCAG 監査
npm run e2e:full      # 全プロジェクト
npm run e2e:report    # レポート閲覧
```

`E2E_BASE_URL`（既定 http://localhost:5175）・`E2E_PASSWORD`（既定 devpass12345）で上書き可。

## スコープ
| スコープ | 内容 | トリガ |
|---|---|---|
| smoke | 主要導線（Chromium） | PR 自動 |
| a11y | WCAG 監査（axe） | 手動 |
| full | 全テスト×全ブラウザ | 手動 |
| mobile | iPhone エミュ | 手動 |

CI は `.github/workflows/review-board-e2e.yml`。
