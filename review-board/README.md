# review-board

成長支援型レビューコミュニティアプリ。投稿に対して**多軸評価＋コメント＋合格バッジ**で建設的なフィードバックを返す、IT未経験学習者向けの相互レビュー基盤。

> 重点軸（S 軸）: **セキュリティ／認可**
> 設計判断の根拠は [docs/要件定義書.md](./docs/要件定義書.md) と [docs/品質判定表.md](./docs/品質判定表.md) を参照。

---

## 技術スタック

| 層 | 技術 | ローカルポート |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind v4 | 5175 |
| Backend  | Spring Boot 3 + Java 21 + Gradle | 8082 |
| DB       | PostgreSQL 16（Docker） | 5434 |
| Object Storage | MinIO（本番 S3 互換） | 9002 / 9003 |
| IaC      | Terraform（AWS 無料枠 EC2 + RDS） | — |
| CI/CD    | GitHub Actions（Lint・Test・CodeQL・SBOM・CD自動） | — |

詳細は [docs/技術スタック.md](./docs/技術スタック.md)・[docs/インフラ構成.md](./docs/インフラ構成.md)。

---

## ローカル起動

```bash
# ① DB + MinIO（Docker）
cd review-board
docker-compose up -d

# ② バックエンド（Spring Boot）
cd backend && ./gradlew bootRun

# ③ フロントエンド（Vite）
cd frontend && npm install && npm run dev
# → http://localhost:5175
```

ポート競合時の挙動は [~/Desktop/Cursor/CLAUDE.md §10](../CLAUDE.md) のルール（殺してから正規ポートで起動）に従う。

---

## 学習スコープでの意図的な簡素化

本リポジトリは**学習目的・AWS 無料枠運用**を前提とし、本格運用フェーズで強化する論点を以下の通り**意図的に簡素化**している（恒久排除ではなく、現フェーズの判断）：

| 項目 | 現フェーズ（学習・無料枠） | 本実装時の論点 | 出典 |
|---|---|---|---|
| **Multi-AZ / 冗長化（S-2）** | 単一 AZ・単一 EC2・単一 RDS | RDS Multi-AZ・ALB + 複数 EC2・Auto Scaling | [docs/インフラ構成.md §10](./docs/インフラ構成.md) |
| **正規 TLS** | 自己署名 HTTPS（実機検証済） | 正規ドメイン + Let's Encrypt（手順書あり） | [docs/正規TLS手順（DuckDNS＋LetsEncrypt）.md](./docs/正規TLS手順（DuckDNS＋LetsEncrypt）.md) |
| **クロスアカウントバックアップ** | 同一アカウント内自動バックアップ | AWS Organizations + クロスアカウント保管 | [CLAUDE.md §13](../CLAUDE.md) |

これらは [docs/品質判定表.md](./docs/品質判定表.md) で **「対象外（簡素化）」** とマーキングされ、簡素化の事実・理由・本実装時の論点を 1 行ずつ明文化している（要件 §2-2 に準拠）。

> **設計上の前提**：S-2 の本番デプロイ自体は実証済（AWS 36/36・自己署名 HTTPS・§8-2 全 pass・CD 自動化）。残る冗長化を有効化した時点で S-2 を A 評価に格上げする。

---

## 現状の達成度（要約）

- **S（重点軸セキュリティ）**：MUST 全達成・**S 基準達成**（多層防御・認可マトリクス・監査ログ ハッシュチェーン・MFA/TOTP・2FAリカバリコード）
- **M（保守性）**：CI Fail Fast・通し E2E（smoke + a11y）達成
- **P（性能・UX）**：P-1 性能目標値定義・実測達成、P-9 a11y は Lighthouse 全ページ 100
- **S-2（安定性）**：本番デプロイ稼働実証済。冗長化は意図的に未有効化

詳細は [docs/品質判定表.md](./docs/品質判定表.md)（生きた文書として実装進捗に応じて更新）。

---

## 関連ドキュメント

- [要件定義書.md](./docs/要件定義書.md)
- [画面設計書.md](./docs/画面設計書.md)
- [ER図.md](./docs/ER図.md)
- [テスト計画書.md](./docs/テスト計画書.md)
- [脅威モデリング.md](./docs/脅威モデリング.md)
- [ログ・監視・障害対応設計書.md](./docs/ログ・監視・障害対応設計書.md)
- [デプロイ・ロールバック手順.md](./docs/デプロイ・ロールバック手順.md)
- [ADR/](./docs/ADR/)（アーキテクチャ意思決定記録）
