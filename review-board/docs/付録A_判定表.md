# review-board 付録A：A判定表／S判定表

> 母要件定義書 [付録A](../../母要件定義書.md) の判定表を review-board に転記し、実装後の判定を埋めたもの。
> 要件定義書 §0（オールA宣言＋S軸宣言）の達成度を、母 第2部の MUST/SHOULD 要件 ID 単位で評価する。
>
> **判定の凡例**
> - **A**：要件を満たす（弱点なし）。根拠（実装箇所・テスト）を備考に記す。
> - **要改善**：MUST だが未達。その軸の弱点になる（床を割る）。
> - **N/A**：SHOULD で未実施。床は割れないが将来リスクとして残す（理由を記す）。
> - **対象外（簡素化）**：学習スコープで現フェーズ対象外。簡素化の事実・理由・本実装時の論点を記す（要件 §2-2）。
>
> **判定時点：2026-05-23 / Phase 1（バックエンド MVP）。フロントエンド・AWS デプロイは未実装。**

---

## 0. 総括（先に結論）

| 軸 | 床（A判定）の状態 | 要点 |
|---|---|---|
| セキュリティ（★S軸） | **MUST 全達成（SEC-8 も #123 で実装・A 化）** | S基準4項目も達成 → **S判定：S** |
| 安定性・信頼性 | 本番デプロイ実証済（S-2 の「未デプロイ」解消）。冗長化のみ意図的に未有効化 | S-3 再計算バッチ #129。S-2 は #189 で本番稼働・§8-2 全 pass・CD 自動化。冗長化(Multi-AZ/ALB)は無料枠で Single-AZ＝対象外（簡素化） |
| 保守性・拡張性 | **MUST 全達成**（CI 常設＝M-6 A・実ブラウザ検証＝M-13 A） | SHOULD の一部が N/A |
| 性能・UX | **MUST 全達成**（P-9 a11y を #202 で Lighthouse 監査・A 化） | P-1 目標値定義＋実測済。P-2/P-3/P-5 も達成 |

> **正直な現状認識（2026-05-25 更新）**：S軸（セキュリティ）は MUST 全達成で S 基準も満たし **S を名乗れる**。保守性は CI・実ブラウザ検証で MUST 全達成。性能/UX は P-1 を #127 で定義・実測し、**P-9 a11y を #202 で Lighthouse 実機監査して A 化**（ログイン/投稿フォーム 100・ラベル関連付け/main/リンク名を修正）→ MUST 全達成。安定性は **S-2 を #189 で本番デプロイし稼働実証**（AWS 36/36・自己署名HTTPS・§8-2 認可マトリクス/合格バッジ/S3画像 全 pass・CD 自動化実証）。**→ 純粋な未達 MUST（P-9）は解消。S-2 の『未デプロイ』ブロッカーも解消した。** ただし S-2 が指す**冗長化（Multi-AZ/ALB）は無料枠で意図的に Single-AZ＝対象外（簡素化）**のままで、これを有効化して初めて S-2 を A と呼べる。よって「オールA床」とは**まだ宣言しない**（残＝冗長化の有効化・正規ドメイン＋Let's Encrypt・装飾 AppShot の実スクショ差し替え〔aria-hidden 済で実害なし〕）。本表は実装進捗に応じて更新する（生きた文書）。

---

## 1. A判定表（床：品質4軸 × 要件ID）

### 1-1. 安定性・信頼性

| 要件ID | 区分 | 判定 | 根拠・備考 |
|---|---|---|---|
| S-1 可用性目標 | MUST | A | 要件 §2-1「当面実運用しない／SLA を定めない」と明記（母 S-1 は学習用の明記で可） |
| S-2 冗長化≠スケーリング設計 | MUST | 対象外（簡素化）／デプロイ実証済 | #133 IaC → **#189 で本番 apply・稼働実証**（AWS 36/36・§8-2 全 pass・CD 自動化）。冗長化（Multi-AZ/ALB+複数EC2）≠スケーリングの区別はインフラ構成.md §10 に設計済だが、無料枠のため **Single-AZ を意図的選択＝対象外（簡素化）**。冗長化を有効化した時点で A 化 |
| S-3 非正規化カウンタ同一TX＋再計算 | A | 同一 TX 更新（`ReviewService`）に加え、#129 で**定期再計算バッチ**（`ReconciliationService`・毎日 04:00）を実装。権威ソース（実テーブル件数）から review_count/thanks_count/received/given/thanks_received を再計算し drift を補正・WARN ログ。Testcontainers で補正を回帰検証 |
| S-4 ソフトデリート | SHOULD | A | `Post.deletedAt`・`Review.deletedAt` で論理削除。取得は `...DeletedAtIsNull` |
| S-5 Flyway＋後方互換 | MUST | A | Flyway `V1__init.sql` でスキーマ管理。Expand/Contract は本番移行時 |
| S-6 不可逆操作にバックアップ＋人間承認 | MUST | A | アプリ層に物理削除なし（全て論理削除）。CLAUDE.md §6/§12 の多層防御を継承 |
| S-7 ゼロダウンタイムデプロイ | SHOULD | N/A | 未デプロイ（Phase3） |
| S-8 切断検知・自動再接続 | SHOULD | N/A | 接続維持系機能（WS 等）なし。リアルタイムは要件で対象外 |

### 1-2. セキュリティ（★S軸）

| 要件ID | 区分 | 判定 | 根拠・備考 |
|---|---|---|---|
| SEC-1 bcrypt 保存 | MUST | A | `SecurityConfig` の `BCryptPasswordEncoder`。平文・可逆なし |
| SEC-2 認可はバックエンド | MUST | A | 全認可を Service/`@PreAuthorize` で判定。フロント非依存（脅威モデリング §3） |
| SEC-3 親子ID 所有検証→404 | MUST | A | `PostService.loadOwned`・`ReviewService.ownedReview`・cohort 限定 finder。`*AuthorizationIntegrationTest` |
| SEC-4 ロールベース認可 | MUST | A | `AuthPrincipal.role` ＋ `@PreAuthorize("hasRole('TEACHER')")`（評価・監査） |
| SEC-5 XSS 対策 | MUST | A | レビュー本文等はプレーンテキスト（JSON 自動エスケープ）。HTML 化なし。**フロント実装時に DOMPurify/CSP を確認** |
| SEC-6 SQLi 対策 | MUST | A | Spring Data JPA／パラメータバインドのみ。文字列結合クエリなし |
| SEC-7 JWT in HttpOnly Cookie＋rotation＋reuse 検知 | MUST | A | `JwtService`／`RefreshTokenService.rotate`（SHA-256 ハッシュ・使い捨て・盗用全失効）／`AuthCookies`（HttpOnly+Secure+SameSite=Strict） |
| SEC-8 アップロードはマジックバイト判定・外部隔離 | MUST | **A** | #123 で実装。`POST /api/uploads/screenshot`＝**先頭バイトで PNG/JPEG/WebP 判定**（拡張子・Content-Type 不信）・5MB 上限（multipart＋サービス二重）・**private バケット保存＋短命署名 URL**（直アクセス 403 を実機確認）。Testcontainers MinIO で 200/400/401 回帰 |
| SEC-9 機密は env 駆動・平文禁止 | MUST | A | JWT secret／DB／seed すべて env・fail-fast。平文ハードコードなし（機密スキャン済） |
| SEC-10 DTO で Entity を直接出さない | SHOULD | A | 全レスポンスは `*Response` DTO（UserResponse/PostResponse/ReviewResponse/…） |
| SEC-11 CORS は自オリジンのみ | MUST | A | `CorsConfig` が単一オリジン（env `CORS_ALLOWED_ORIGIN`＝localhost:5175）のみ許可 |
| SEC-12 危険操作にレートリミット | SHOULD | N/A | 未実装。ログイン試行のレート制限は本実装時に検討（脅威モデリング §7） |
| SEC-13 セキュリティヘッダ | SHOULD | N/A | CSP/HSTS/X-Frame-Options 未付与。本番 HTTPS 終端時に付与 |

### 1-3. 保守性・拡張性

| 要件ID | 区分 | 判定 | 根拠・備考 |
|---|---|---|---|
| M-1 Issue ファースト＋PR＋main 保護 | MUST | A | 全変更が Issue→PR→squash（PR #90〜）。main 直 push なし |
| M-2 Conventional Commits＋テンプレ＋Closes | MUST | A | 日本語 Conventional Commits・PR テンプレ・`Closes #` 運用 |
| M-3 層分離 | MUST | A | Controller / Service / Repository を分離。認可は Service に一元化 |
| M-4 グローバル例外一元化 | MUST | A | `GlobalExceptionHandler`（401/403/404/400/validation）。silent catch なし |
| M-5 プロファイルで環境差 | MUST | A | `DevDataSeeder` は `@Profile("dev")`。application.yml は env 駆動 |
| M-6 CI は Fail Fast（lint→build→test） | MUST | A | backend CI（#108・build→test／Testcontainers）＋frontend CI（#114・lint→build）＋依存脆弱性スキャン（Trivy）の3本を常設。すべて Fail Fast・paths で review-board 配下に限定 |
| M-7 テストピラミッド | MUST | A | 結合テスト（Testcontainers）中心。ロジックが単純なため単体は最小限 |
| M-8 テスト状態分離 | MUST | A | Testcontainers で本番同等 DB・`AbstractIntegrationTest` が毎回 FK 順クリーンアップ |
| M-9 カバレッジ目安＋境界値 | SHOULD | N/A | JaCoCo はレポートのみ（ゲートなし・テスト計画書 §5）。認可の境界（ロール×所有者×cohort）は網羅 |
| M-10 flaky 対策（条件待ち） | SHOULD | A | 固定 sleep なし（MockMvc 同期実行） |
| M-11 抽象化で交換可能 | SHOULD | N/A | S3/MinIO は AWS SDK 直利用。抽象化層は本実装時に検討 |
| M-12 AI レビューは補完＋型 | MUST | A | `claude-code-review.yml`＋Java の静的型 |
| M-13 UI 変更は実ブラウザ検証 | MUST | A | フロント実装済（#110〜#116）。Chrome DevTools で「ログイン→投稿→レビュー→評価→成長記録」通し e2e をコンソールエラー 0 で実証 |
| M-14 IaC | SHOULD | A | #133 で `review-board/infra/` に Terraform 一式（VPC/EC2/RDS/S3/IAM/SSM/Budgets）。fmt/validate/tflint/tfsec クリーン（ignore は理由付き）。インフラを IaC で管理する実体が存在（apply は承認後） |
| M-15 コンテナ化 | SHOULD | A | `docker-compose.yml`（PostgreSQL 5434・MinIO） |

### 1-4. 性能・UX

| 要件ID | 区分 | 判定 | 根拠・備考 |
|---|---|---|---|
| P-1 主要操作の性能目標値 | A | #127 で [性能目標.md](./性能目標.md) を作成（8操作の P95 目標）。#121 の Micrometer で**ローカル実測し全操作が目標内**（投稿一覧 P95 5.3ms / 成長記録 5.5ms / ログイン 265ms<600ms）。本番目標は Phase3 で再定義 |
| P-2 ページネーション | MUST | A | 投稿一覧は `Slice`（`PostController`）。成長記録は集約取得 |
| P-3 N+1 回避 | MUST | A | `ReviewService.listForPost`・`ProfileService` で axis/reviewer/評価をバッチ取得 |
| P-4 しおり集計 | SHOULD | N/A | 未読等の機能なし |
| P-5 キャッシュ規律 | MUST | A | キャッシュ未使用（認可情報をキャッシュしない＝規律遵守） |
| P-6 コネクションプール | MUST | A | HikariCP 既定。常時接続なし |
| P-7 検索の段階最適化 | SHOULD | N/A | 検索は Phase2 |
| P-8 楽観的UI更新 | SHOULD | N/A | フロント実装済だが楽観更新は未採用（再取得方式）。SHOULD のため床は割れない。フロント深掘り時に検討 |
| P-9 アクセシビリティ WCAG A | MUST | A | #183 コントラストAA/select-name＋#202 で Lighthouse 実機監査（ログイン/投稿フォーム **100**）。フォームラベル `htmlFor` 関連付け・`<main>` landmark・プロフィールリンク `aria-label` を修正。残：一覧の装飾 `AppShot`（aria-hidden 済＝SR 実害なし）の contrast は実スクショ差し替えで解消予定 |
| P-10 画像は外部ストレージ | SHOULD | A | `screenshot_key` で外部参照（MinIO/S3）。バイナリを DB に保存しない設計 |

---

### 1-5. 第3部 横断要件（補追）

> 母「第3部 横断要件」は当初の判定表（第2部 ID のみ）から漏れていたため補追する（レビュー指摘）。
> 詳細は [ログ・監視・障害対応設計書.md](./ログ・監視・障害対応設計書.md)。

| 横断要件 | 判定 | 根拠・備考 |
|---|---|---|
| §3-1 ログ・監視・オブザーバビリティ | **A**（自動アラートのみ Phase3） | 監査ログ（誰が・何を）は audit_logs で **A**。構造化ログ/MDC（requestId/userId）・Micrometer 4ゴールデンシグナル（`/actuator/prometheus`・運用ロール限定）を **#121 で実装済＝A**。閾値超の自動アラート連携のみ Phase3（AWS）で追加 |
| §3-2 設定・機密の外部化 | A | JWT secret/DB/seed すべて env 駆動・fail-fast・平文ハードコードなし（SEC-9 と一致） |
| §3-3 エラーハンドリング標準 | A | `GlobalExceptionHandler` で一元化（401/403/404/400・silent catch なし） |
| §3-4 リリース・運用フロー（誤操作多層防御） | A | Issue→PR→squash・main 保護・CI（build/test・依存スキャン・lint）。CLAUDE.md §12 の多層防御を継承 |

## 2. S判定表（宣言した S軸：セキュリティ・認可）

> A基準（床）＝セキュリティ軸の MUST 全件 A。SEC-8 も #123 で実装し A 化（magic byte 判定・サイズ上限・private 隔離＋署名 URL）。**SEC MUST は全て A。**

| S基準（要件 §0 で定義した測定可能条件） | 判定 | 根拠 |
|---|---|---|
| 認可テストが全エンドポイントを網羅し、IDOR が自動テストで 100% 阻止される | **S** | 全14エンドポイントの拒否系を含む **31 認可テスト** green（他cohort/他人=404・権限昇格=403） |
| 依存脆弱性スキャンを CI に常設し High/Critical 0 件を維持 | **S** | `review-board-dependency-scan.yml`（Trivy）。検出16件→修正→**0件 green**で運用中 |
| 主要な認可境界を脅威モデリング表として文書化・保持 | **S** | [脅威モデリング.md](./脅威モデリング.md)（資産・3層信頼境界・全14EP・T-1〜T-8） |
| 監査ログで「誰が・いつ・誰の資源に・何を」を追跡できる | **S** | `audit_logs`＋`AuditService`（操作と同一 TX で記録）・講師限定閲覧 |

**S判定：S（セキュリティ・認可）** — A基準（SEC MUST 全達成）を満たし、S基準4項目すべて達成。

> 床を割らない約束（要件 §0）の確認：認可多層化で体感速度を犠牲にしない（キャッシュ規律・N+1回避）／認可ロジックは Service に一元化（M-3）／認可失敗は graceful に 401/403/404 を返す（GlobalExceptionHandler）。

---

## 3. 残課題（A床 完成に向けて）

実装進捗で本表を更新する。現時点の未達 MUST（＝床の弱点）と対応フェーズ：

| 項目 | 要件 | 対応フェーズ |
|---|---|---|
| 冗長化・ゼロダウンタイム | S-2/S-7 | 本番デプロイは #189 で実証済。冗長化（Multi-AZ/ALB）有効化は本格運用フェーズ（無料枠脱却時） |
| 正規ドメイン＋Let's Encrypt | （運用） | 現状は自己署名 HTTPS。外部レジストラでドメイン取得後 `certbot` で差し替え |
| 装飾 AppShot を実スクショに | （磨き込み） | 一覧サムネを `post.screenshotUrl` の実画像へ。aria-hidden 済で a11y 実害なし |

> **済**：M-6（CI Fail Fast）＝常設で A。M-13（実ブラウザ検証）＝通し e2e で A。P-1（性能目標値）＝#127 で定義・実測で A。S-3（再計算バッチ）＝#129 で実装で A。**P-9（a11y WCAG）＝#202 で Lighthouse 監査・A。S-2（本番デプロイ）＝#189 で稼働実証**（冗長化のみ意図的に Single-AZ＝対象外）。

---

## 4. 関連ドキュメント

- [要件定義書.md](./要件定義書.md) §0（オールA＋S軸宣言）・§7（本表の TODO）
- [脅威モデリング.md](./脅威モデリング.md)（S判定の根拠）
- [ログ・監視・障害対応設計書.md](./ログ・監視・障害対応設計書.md)（第3部 横断要件 §3-1 の詳細）
- [テスト計画書.md](./テスト計画書.md)（認可テストの網羅）
- [母要件定義書.md](../../母要件定義書.md) 付録A（本表の原典フォーマット）
