# review-board アプリ層デプロイ資産（S-2 / #161・#189）

`infra/` の Terraform が用意した土台（EC2＋nginx＋Java＋SSM＋S3＋IAM）の上に、
**アプリの器**（systemd・nginx vhost・env・デプロイ機構）を載せるための資産。
user_data.sh は土台までで止め、ここから先を本ディレクトリで定義する。

| ファイル | 役割 |
|---|---|
| `provision.sh` | 一度きりの初期化（EnvironmentFile を SSM から生成・systemd/nginx 設置・TLS・deploy.sh 設置） |
| `review-board.service` | systemd ユニット（`current/app.jar` を prod 起動） |
| `nginx-review-board.conf` | vhost（HTTP・`/api`→127.0.0.1:8082・actuator 非公開）。certbot が 443/リダイレクトを追記 |
| `nginx-review-board-tls.conf` | 自己署名モード用 vhost（443/TLS＋80→443 リダイレクト・同 location） |
| `deploy.sh` | アプリのみ更新（S3 から `<sha>` 取得→current 切替→再起動→localhost health）。cd-deploy が SSM で呼ぶ |

## 前提（env の出所）
`provision.sh` は SSM `/review-board/prod/*` から以下を読む（Terraform が作成）：
`JWT_SECRET`・`DATABASE_URL`・`DATABASE_PASSWORD`・`S3_BUCKET`・`ARTIFACTS_BUCKET`・
（任意）`BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`。
静的な本番値（`SPRING_PROFILES_ACTIVE=prod`・`JWT_COOKIE_SECURE=true`・`S3_REGION`）は provision.sh が固定。
フロントは相対 `/api`＝同一オリジンのため、デザイン/挙動は localhost:5175 と同一。

## 初回手順（apply 後・EC2 上で 1 回）
```bash
# 1) Session Manager で EC2 に入り、リポジトリを取得
sudo dnf install -y git
git clone <repo> /tmp/rb && cd /tmp/rb/review-board/infra/deploy

# 2) 初期化（TLS は3モード。PUBLIC_ORIGIN は CORS 用＝同一オリジンなら省略可）
#   a) ドメインあり（Let's Encrypt）：
sudo PUBLIC_ORIGIN=https://<domain> DOMAIN=<domain> ./provision.sh
#   b) ドメイン無し（自己署名・IP 直 HTTPS。ブラウザ警告は想定どおり）：
sudo TLS_SELFSIGNED=1 PUBLIC_ORIGIN=https://<EIP> ./provision.sh
#   ※ JWT_COOKIE_SECURE=true 固定のため、いずれかの HTTPS が必須（HTTP のみだとログイン不可）

# 3) 初回のアプリ投入（cd-build が S3 に push 済みの SHA を指定）
sudo /opt/review-board/deploy.sh <sha>
```
以降の更新は **cd-deploy（手動 dispatch）** で `sha` を渡すだけ。ロールバックは
`docs/デプロイ・ロールバック手順.md`（前 SHA を再昇格）。

## CD 連携に必要な設定（GitHub 側）
- secrets：`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`（cd-build の S3 push・cd-deploy の SSM 用）
- variables：`RB_ARTIFACTS_BUCKET`（Terraform 出力 `artifacts_bucket` の値）

> いずれも S-2 実施時に設定する。未設定の間は cd-build は GitHub Artifact のみ、cd-deploy は安全にスキップ。
