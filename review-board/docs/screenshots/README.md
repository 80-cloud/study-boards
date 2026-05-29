# 画面スクリーンショット集

review-board の主要画面を、第三者がリポを開いた直後でも完成度を視認できるように記録する（[要件定義書.md](../要件定義書.md) §3 機能要件 と [画面設計書.md](../画面設計書.md) に対応）。

## 撮影条件（共通）

| 項目 | 値 |
|---|---|
| 撮影日 | 2026-05-29 |
| 環境 | ローカル開発（`docker-compose up -d` + `backend bootRun` + `vite dev`） |
| ブラウザ | Chromium 148（Chrome DevTools MCP 経由） |
| ビューポート | 1440 × 900 |
| 出力 | PNG（sips で 1440 幅に正規化、各画像 < 500KB） |
| データ | dev seed（teacher@example.com / student@example.com、本番データなし） |

## 画面一覧

| # | ファイル | 画面 | 主な対応機能 / 出典 |
|---|---|---|---|
| 01 | [01-login.png](./01-login.png) | ログイン | F-AUTH-01（招待制ログイン） |
| 02 | [02-register.png](./02-register.png) | 新規登録（招待コード入力） | F-AUTH-02（招待コード登録・#207） |
| 03 | [03-terms.png](./03-terms.png) | 利用規約 | プライバシー脚注 / [脅威モデリング.md](../脅威モデリング.md) |
| 04 | [04-privacy.png](./04-privacy.png) | プライバシーポリシー | 母 SEC-5（個人情報・暗号化・退会） |
| 05 | [05-top-posts.png](./05-top-posts.png) | トップ（受講生ログイン後・成果物一覧） | F-POST-01 / F-LIST-01 |
| 06 | [06-post-detail.png](./06-post-detail.png) | 投稿詳細 + 講師評価 + レビュー一覧 | F-REV-01 / F-EVAL-01 / 合格バッジ |
| 07 | [07-review-form.png](./07-review-form.png) | レビューフォーム（多軸：動作・保守性・セキュリティ・性能） | F-REV-01（4 軸 + 良かった点 / 改善点） |
| 08 | [08-profile.png](./08-profile.png) | プロフィール（継続の記録・通知設定・2FA・データ管理） | F-GROW-01 / 2FA・データエクスポート・退会 |
| 09 | [09-dashboard.png](./09-dashboard.png) | **運営ダッシュボード**（概況・週次トレンド・ケア対象メンバー） | F-INSIGHT-01（#465 / 講師・管理者専用） |
| 10 | [10-notifications.png](./10-notifications.png) | 通知一覧（🙏 ありがとう / ⭐ ベスト / 💬 メンション） | F-NOTIF-01 |
| 11 | [11-invites.png](./11-invites.png) | 講師の招待・メンバー管理（招待コード発行・無効化） | F-INVITE-01 / #207 |

## 留意事項

- すべての画像はローカル dev データで撮影しており、**本番ユーザー情報・本番投稿は含まれていません**
- avatar 画像の URL に MinIO（ローカル S3 互換）の署名付き URL が含まれますが、ローカル鍵で短命のため有効ではありません
- 認可（dashboard・invites は講師・管理者専用）は画面上でも `権限がありません` と返ることを実機確認済（[品質判定表.md](../品質判定表.md) §8-2 認可マトリクス）
- スクリーンショット差し替え時は本 README の「撮影日」を更新すること
