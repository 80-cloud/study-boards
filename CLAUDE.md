# CLAUDE.md — Claude Code 行動規範

> このファイルは Claude Code が毎セッション必ず読み込み、厳守するルール集です。
> 記載のルールに反する操作（直接 main への push など）は、ユーザーに確認なく実行しないこと。

---

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| プロジェクト名 | タスク管理ボード (hideharu-AI) |
| リポジトリ | https://github.com/80-cloud/hideharu-AI |
| バックエンド | Java 25 + Spring Boot 3.5.14 + Gradle 9.x |
| フロントエンド | HTML / CSS / JavaScript (v1.0) → React + Tailwind CSS (v2.0) |
| データベース | PostgreSQL 16（Docker コンテナ） |
| 作業ディレクトリ | /Users/macmini/dev/Cursor |

---

## 1. ブランチ命名規則

作業を始める前に必ず Issue を作成し、その番号をブランチ名に含めること。

| 種別 | 命名パターン | 例 |
|---|---|---|
| 新機能 | `feature/#(番号)-(短い説明)` | `feature/#12-login-page` |
| バグ修正 | `fix/#(番号)-(説明)` | `fix/#15-card-drag-bug` |
| ドキュメント | `docs/#(番号)-(説明)` | `docs/#8-readme-update` |
| 雑務・設定 | `chore/#(番号)-(説明)` | `chore/#3-setup-eslint` |

**禁止事項:**
- `main` ブランチへの直接 push は絶対禁止
- Issue 番号のないブランチ名は作成しない
- `master` ブランチは使用しない

---

## 2. Issue ファースト・ワークフロー

**作業を始める前に必ず GitHub Issue を作成すること（または既存 Issue を確認すること）。** コードを書く前の手順：

```
① GitHub で Issue を作成する（テンプレートを使用）
         ↓
② Issue 番号を確認する（例: #12）
         ↓
③ ブランチを作成する: git checkout -b feature/#12-説明
         ↓
④ 作業・コミットを行う
         ↓
⑤ PR を作成し、Issue を Closes #12 でリンクする
         ↓
⑥ main へマージ後、ブランチを削除する
```

---

## 3. コミットメッセージ規則

**すべてのコミットメッセージは Conventional Commits 形式で、日本語で書くこと。**

### フォーマット

```
種別: 変更の要約（日本語・50文字以内）

詳細説明（任意・72文字で折り返す）
関連する背景・理由・注意点などを書く。

Closes #(Issue番号)  ← 該当する場合のみ
```

### 種別一覧

| 種別 | 用途 |
|---|---|
| `feat` | 新機能の追加 |
| `fix` | バグの修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの動作に影響しない変更（フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコード変更 |
| `test` | テストの追加・修正 |
| `chore` | ビルドツールや補助ツールの変更 |

### コミットメッセージ例

```
feat: タスクカードのドラッグ&ドロップ機能を追加

Sortable.js を使ってカラム間・カラム内の並び替えを実装。
期限順・優先度順の一括並び替えボタンも追加した。

Closes #12
```

```
fix: 期限切れタスクに警告マークが表示されないバグを修正
```

```
docs: DB設計書にインデックス設計を追記
```

---

## 4. プルリクエスト (PR) 規則

- **タイトルは日本語で書くこと**
- **必ず `.github/pull_request_template.md` のテンプレートを使用すること**
- **必ず関連 Issue を `Closes #番号` で本文にリンクすること**
- **main ブランチへのマージ方法: Squash and merge（スカッシュマージ）を使うこと**
- PR のタイトルはコミットメッセージと同じ形式にすること: `種別: 説明`

### PR タイトル例

```
feat: タスクの追加・編集・削除機能を実装
fix: Dockerコンテナ起動時のポート競合を修正
docs: README にローカル環境構築手順を追加
```

---

## 5. ラベル運用ルール

Issue・PR には必ずラベルを付けること。

| ラベル | 色 | 用途 |
|---|---|---|
| `enhancement` | 水色 | 新機能・改善 |
| `bug` | 赤 | バグ報告・修正 |
| `documentation` | 青 | ドキュメントのみの変更 |
| `chore` | グレー | 設定・ツール・依存関係の変更 |

---

## 6. 禁止事項（Claude Code が守るべきルール）

1. `git push origin main` を直接実行しない
2. `git push --force` を main に対して実行しない
3. Issue なしにブランチを作成しない
4. 英語でコミットメッセージを書かない（日本語必須）
5. PR なしに main へのコードを反映しない
6. `.env` ファイルを Git にコミットしない
7. データベースのパスワードをコードに直書きしない
8. **`terraform destroy` を本人の明示承認なしに実行しない**（特に auto-approve禁止）
9. **`terraform apply -auto-approve` を本人の明示承認なしに実行しない**（破壊的変更が含まれる可能性）
10. **`aws *delete*` `aws *terminate*` `aws s3 rb*` を本人の明示承認なしに実行しない**
11. **本番データベース・バックアップを削除する操作は、AI 単独で完結させない**（必ず人間の承認をはさむ）
12. **公開リポには一般的な用語で記述する**（ブラックボックス化方針）：
    - 個別の禁止語と代替表現の対応表は、リポジトリ外で管理する運用ガイドに従う
    - 適用範囲：docs / Issue / PR タイトル・本文 / コミットメッセージ
    - ID 体系（`M-`/`S-`/`SEC-`/`P-`）は一般的な命名規則として継続使用可
13. **親ドキュメント（リポ外管理）への直接リンクを docs に書かない**：
    - 禁止：リポジトリ外で管理する親ドキュメントへの相対パスでの直接リンク
    - 許容：「共通の設計方針（リポジトリ外で管理）」のテキスト言及
    - 理由：リンクが壊れる＋親の存在自体を明示しない

---

## 7. 技術スタック補足（Claude Code 向け）

### サービス起動（起動順を守ること）

```bash
# ① PostgreSQL を Docker で起動
cd /Users/macmini/dev/Cursor/task-board
docker-compose up -d

# ② Spring Boot を起動（Gradle）
cd /Users/macmini/dev/Cursor/task-board/backend
./gradlew bootRun

# ③ React フロントエンドを起動（Vite）
cd /Users/macmini/dev/Cursor/task-board/frontend
npm run dev
```

> ポート競合が発生した場合はセクション10のルールに従うこと。

### ビルドツール

- バックエンド: **Gradle**（`build.gradle` を使用）
  - ビルドファイル: `task-board/backend/build.gradle`
- フロントエンド: **Node.js v25 / npm / Vite**（`package.json` を使用）
  - ビルドファイル: `task-board/frontend/package.json`

### ファイル構成

```
/Users/macmini/dev/Cursor/
├── CLAUDE.md                    ← 本ファイル（必読）
├── README.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
└── task-board/
    ├── index.html               ← フロントエンド v1.0（旧）
    ├── style.css                ← フロントエンド v1.0（旧）
    ├── app.js                   ← フロントエンド v1.0（旧）
    ├── prototype.html           ← プロトタイプ（旧）
    ├── 要件定義書.md
    ├── docker-compose.yml       ← PostgreSQL 起動
    ├── docs/
    │   ├── 画面設計書.md
    │   ├── DB設計書.md
    │   └── 技術スタック.md
    ├── frontend/                ← React フロントエンド v2.0（現行）
    │   ├── index.html
    │   ├── vite.config.js
    │   ├── package.json
    │   └── src/
    │       ├── main.jsx
    │       ├── App.jsx
    │       ├── api/taskApi.js
    │       ├── components/
    │       │   ├── Header.jsx
    │       │   ├── Board.jsx
    │       │   ├── Column.jsx
    │       │   └── TaskCard.jsx
    │       ├── context/TaskContext.jsx
    │       └── utils/dateUtils.js
    └── backend/                 ← Spring Boot (Java 25)
        ├── build.gradle
        └── src/main/java/com/taskboard/
            ├── config/CorsConfig.java
            ├── domain/task/
            │   ├── Task.java
            │   ├── TaskController.java
            │   ├── TaskRepository.java
            │   └── TaskService.java
            └── exception/
                ├── GlobalExceptionHandler.java
                └── TaskNotFoundException.java
```

---

## 8. GitHub ブランチ保護設定（セットアップ用コマンド）

リポジトリを新規セットアップする際や保護設定をリセットする際に使用する `gh api` コマンド。

```bash
gh api repos/80-cloud/hideharu-AI/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

> `required_pull_request_reviews` を設定することで、PR なしに main へマージできなくなる。
> `required_approving_review_count: 0` はソロ開発向け（承認者不要、ただし PR 自体は必須）。

**Note:** 個人リポジトリでは PR レビューの必須化ができない場合がある（GitHub Free 制限）。  
その場合は `"required_pull_request_reviews": null` に変更し、CLAUDE.md のルールで運用カバーする。

---

## 9. 検証方法

セットアップ後に以下のコマンドで正しく設定されているか確認すること。

```bash
# 1. CLAUDE.md の内容確認
cat CLAUDE.md

# 2. ブランチ保護が有効か確認
gh api repos/80-cloud/hideharu-AI/branches/main/protection | python3 -m json.tool

# 3. ラベル一覧確認
gh label list --repo 80-cloud/hideharu-AI
```

3 については、以降の作業で Claude Code がルールに従って動作するか実際に確認する。  
（Issue 作成 → ブランチ作成 → 実装 → コミット → PR 作成 → マージ の順に実施）

---

## 10. ポート競合の扱い（Claude Code 必須ルール）

### 使用ポート一覧

| サービス | コマンド | ポート |
|---|---|---|
| Spring Boot（バックエンド） | `./gradlew bootRun` | **8080** |
| Vite（フロントエンド） | `npm run dev` | **5173** |
| PostgreSQL（DB） | `docker-compose up` | **5432** |

### ルール

1. **サーバー起動前に必ずポートの空きを確認すること**
2. **ポートが使用中の場合は、そのプロセスを `kill -9` で強制終了してから起動すること**
3. **別ポートでの代替起動は絶対禁止** — CORS 設定・Vite プロキシが崩れてアプリが動作しない

### 理由

- CORS 設定（`CorsConfig.java`）は `http://localhost:5173` のみ許可
- Vite プロキシ（`vite.config.js`）は `http://localhost:8080` に転送
- 上記以外のポートで起動すると API 通信が 100% 失敗する

### 強制終了コマンド（手動で実行する場合）

```bash
# ポート 8080 を解放（バックエンド）
lsof -ti :8080 | xargs kill -9 2>/dev/null; true

# ポート 5173 を解放（フロントエンド）
lsof -ti :5173 | xargs kill -9 2>/dev/null; true

# ポート 5432 を解放（DB）
lsof -ti :5432 | xargs kill -9 2>/dev/null; true
```

> **Claude Code 自動化:** `~/.claude/settings.json` の PreToolUse フックにより、
> `bootRun` / `npm run dev` / `docker-compose up` を実行する直前に自動でポート競合を検知・解消する。

---

## 11. このファイルの更新ルール

- ルールを変更したい場合は、必ず Issue を立ててから PR 経由で変更すること
- 直接編集してコミットしない
- 変更時のコミットメッセージ: `chore: CLAUDE.md のルールを更新 (#番号)`

---

## 12. AI 誤操作防止の多層防御ルール

AWS / Terraform を扱う AI コーディングツールが本番環境を破壊する事故が業界で複数報告されているため、本リポジトリでは **多層防御** で予防する。

### 12-1. 階層別の防御内容

| 階層 | 仕組み | 場所 |
|---|---|---|
| 1. **Claude Code 設定** | `permissions.deny` で破壊的コマンドを拒否 | `~/.claude/settings.json`（本リポジトリ外） |
| 2. **Terraform リソース保護** | `lifecycle { prevent_destroy = true }` | `infra/main.tf` の RDS 等 |
| 3. **開発ルール** | 本ファイル（CLAUDE.md）の禁止事項 | `CLAUDE.md` セクション 6 |
| 4. **コードレビュー** | PR ベースのワークフロー | GitHub PR |
| 5. **AWS リソース保護**（将来） | `deletion_protection = true` / IAM 最小権限 / Backups | AWS Organizations / SCP |

### 12-2. AI が単独で実行してはならない操作

以下は **必ず人間の明示承認をはさむ** こと（CLAUDE.md セクション 6 の補足）：

- `terraform destroy` 全般
- `terraform apply -auto-approve`（明示承認なしの自動適用）
- `terraform state rm` / `terraform workspace delete`
- `aws rds delete-*` / `aws ec2 terminate-*` / `aws s3 rb`
- `aws iam delete-*`（権限・ロール削除は復旧困難）
- 本番データに対する手動 SQL（`DROP TABLE` / `TRUNCATE` 等）

### 12-3. RDS の `lifecycle.prevent_destroy` 運用

`infra/main.tf` の `aws_db_instance.main` に `prevent_destroy = true` を設定済み。
**`terraform destroy` を実行するとエラーで止まる** ようになっている。

正規の手順で削除する場合：

1. `infra/main.tf` を編集して `prevent_destroy = false` に変更
2. `terraform apply`（lifecycle 変更のみ反映、リソースは無変更）
3. `terraform destroy` 実行
4. 完了後、必要なら `prevent_destroy = true` に戻す

→ **「ワンコマンドで destroy できない」状態をデフォルトにすることで、誤操作の窓を狭める**。

### 12-4. デプロイ前監査チェックリスト

PR で AWS / Terraform 変更が含まれる場合、レビュー時に必ず確認：

- [ ] 平文の機密情報がコミットされていない（`grep -rE "(password|secret|api[_-]?key)"`）
- [ ] 環境固有のハードコード（IP / endpoint / bucket 名）が外部化されている
- [ ] 無料枠の範囲内（`describe-instance-types --filters free-tier-eligible=true` で確認）
- [ ] Terraform Toolchain と EC2 上のランタイムバージョンが整合する
- [ ] `terraform plan` の差分に **意図しない destroy** が含まれていない
- [ ] `lifecycle.prevent_destroy` を外す変更があれば、その意図がコミットメッセージに明記されている

これらは `~/.claude/skills/terraform-quality-check/` スキルで一括チェックできる。

---

## 13. 他組織での事故事例（教訓カード）

業界で発生した実事例から学び、同じ過ちを繰り返さないために記録する。

### 13-1. 2026年：Claude Code が Terraform で本番環境を全削除

**概要：**
SNS で報告された事例。Claude Code が Terraform 経由で本番環境のリソースを **バックアップを含めて全削除** したインシデント。

**推測される原因（多層防御がすべて外れていた状態）：**
- AI が `terraform destroy -auto-approve` を制限なく実行できた
- dev / prod が同じ AWS アカウント・同じ tfstate で管理されていた
- RDS / S3 等に `prevent_destroy` / `deletion_protection` が未設定
- バックアップが同じアカウント内（クロスアカウント分離なし）
- AI 用 IAM ロールに削除系の Deny ルールがなかった
- PR-based ワークフローではなく、AI が直接 apply できる構成

**本リポジトリでの予防策：**
- セクション 12 の階層 1〜4 を適用済み
- 階層 5（AWS Organizations / SCP / クロスアカウントバックアップ）は本格運用フェーズで実装予定

**教訓：**
- AI が「クリーンアップして」と言われたら destroy を実行する文脈がある（AI は文脈を慎重に解釈する責任がある）
- **「便利さ」と「安全性」はトレードオフ**：auto-approve の便利さに対して、誤操作のリスクは取り返しがつかない
- バックアップは **必ずクロスアカウント** で保管する（同一アカウント内のバックアップは「同じ削除コマンド」で消える）

詳細は `task-board/docs/incidents/INDEX.md` の参照対象として登録。

### 13-2. 教訓カードの追加方針

新しい事故事例を学んだら、以下の形式で本セクションまたは `incidents/` に追加：

- 概要（何が起きたか）
- 推測される原因（多層防御の何が外れていたか）
- 本リポジトリでの予防策（階層別に何が効くか）
- 教訓（再発防止のために守るべきこと）
