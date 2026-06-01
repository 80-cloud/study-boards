# Tier 移行ログ

このアプリのインフラ Tier 変更を時系列で記録する。
> 関連：インフラ選択ガイド.md（リポジトリ外管理）・../GitHub運用方針.md

---

## 2026-05-27: 初期 Tier 確定

- **採用 Tier**: Tier 0（GitHub Pages 静的配信）
- **選定理由**: 全データを localStorage で完結させるフロントエンド専用 SPA のため、サーバー不要。GitHub Pages の無料枠で月次コスト 0 円。Node 24 LTS + Vite + React のみで完結。
- **適用した防御**:
  - [x] CLAUDE.md にプロジェクト概要・Tier 0・選定理由を記録
  - [x] study-boards リポを public に固定（GitHub Pages の生命線）
  - [x] GitHub Actions CI（build / test / gitleaks / CodeQL / E2E）を常設
  - [x] `npm audit --audit-level=high` を CI に組み込み（依存脆弱性ゼロを担保）

---

## 移行記録テンプレ（コピーして使う）

```markdown
## YYYY-MM-DD: Tier X → Tier Y

- **変更理由**: （何の要件 / 制約で変わったか）
- **適用した防御**:
  - [ ] CLAUDE.md の Tier フィールド更新
  - [ ] 新 Tier の必須対策を インフラ選択ガイド.md §4 から漏れなく適用
  - [ ] README の技術スタック更新
  - [ ] 旧 Tier 固有のリソースを撤収（例：Supabase プロジェクト削除）
- **追加した GitHub workflow**: （ある場合）
- **削除した GitHub workflow**: （ある場合）
- **無料枠への影響**: （新 Tier の上限と現状の見積もり）
- **次に注意すべきこと**: （新 Tier 特有のリスク）
```

---

## Tier 変更がよく起こるパターン

機能追加 PR を書くとき、以下に該当しないか確認する：

| 起きがちな変化 | トリガー要件 |
|---|---|
| Tier 0 → Tier 1 | 他人とデータ共有・認可が必要に |
| Tier 1 → Tier 2 | Supabase プロジェクト 2/2 満杯 |
| Tier 0/1 → Tier 2/3 | リアルタイム通信を入れたい |
| Tier 0 → Tier 1（R2 併用） | ファイル保存・大容量 |
| Tier 1/2 → Tier 3/4 | サーバーで定期処理を回したい |
| Tier 1-3 → Tier 4 | 業務利用・SLA が要る |

→ 該当したら、PR をマージする前にこのログに記録 → Tier 別防御を適用 → CLAUDE.md を更新。
