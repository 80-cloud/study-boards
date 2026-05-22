# review-board backend

成長支援型レビューコミュニティのバックエンド（Phase 1 雛形）。

## スタック
- Java 25 (LTS) / Spring Boot 3.5.5 / Gradle 9.1.0（wrapper）
- PostgreSQL 16 / Flyway / Spring Security / JWT(jjwt) / AWS S3(MinIO)
- 詳細は [docs/技術スタック.md](../docs/技術スタック.md)

> **M-14（toolchain 整合）:** ローカル JDK が 21 でも、Gradle の foojay resolver が
> JDK 25 を自動取得してコンパイルする（`settings.gradle`）。EC2 ランタイムも Corretto 25 に統一する。

## ローカル起動手順

```bash
# 1) 環境変数（.env は Git にコミットしない）
cp .env.example .env   # 値を埋める（DATABASE_PASSWORD / JWT_SECRET は必須）

# 2) DB + MinIO 起動（プロジェクト直下）
cd ..
docker-compose up -d

# 3) バックエンド起動（ポート 8082）
cd backend
./gradlew bootRun
```

## 検証
```bash
./gradlew compileJava        # コンパイル（初回は Gradle 9.1.0 + JDK 25 を取得）
curl http://localhost:8082/actuator/health   # → {"status":"UP"}
```

## ポート（CLAUDE.md §10・別ポート起動禁止）
| サービス | ポート |
|---|---|
| Backend | 8082 |
| PostgreSQL | 5434 |
| MinIO API / Console | 9002 / 9003 |

## 構成（Phase 1 雛形）
- `config/` SecurityConfig（RBAC 土台）・CorsConfig
- `common/` ApiError・GlobalExceptionHandler（共通エラー形式）
- `domain/` 代表エンティティ + リポジトリ（cohort/user/auth/post/review/evaluation）で層構造を提示
- `resources/db/migration/V1__init.sql` Phase 1 全テーブル

各ドメインの Controller/Service・認証フロー・テスト本体は後続 feature PR で追加する。
