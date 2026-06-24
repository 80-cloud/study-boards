# AWS インフラ構成（Terraform）

AWS 上に **VPC / EC2 / ALB / CloudWatch**（＋任意で RDS / WAF / serverless 層）を Terraform でコード化した構成です。
`terraform apply` だけでネットワーク〜監視までを再現でき、アプリの配置・起動は Ansible（SSM 接続）が担います。

## アーキテクチャ

```
                Internet
                   │
              ┌────▼────┐   (HTTP 80)
              │   WAF   │  ← AWS マネージドルールで攻撃をブロック
              └────┬────┘
              ┌────▼────────────────────────┐
              │   ALB（public 2AZ）          │  アクセスログ → S3
              └────┬────────────────────────┘
       (8080・ALB SG からのみ)
        ┌──────────▼──────────┐
        │  EC2（public・t3.micro）│  user_data で自動デプロイ
        │  - SSM 接続（鍵なし）   │  Secrets Manager から DB 認証取得
        └──────────┬──────────┘
        (3306・EC2 SG からのみ)
        ┌──────────▼──────────┐
        │  RDS MySQL（private） │  非公開・保存時暗号化
        │  2AZ サブネットグループ │
        └─────────────────────┘

  監視: CloudWatch アラーム（CPU高負荷／EC2 自己修復）＋ SNS 通知
  state: S3 バケット（S3 ネイティブロックで同時実行を防止）
```

## 主な設計方針（セキュリティ・運用）

- **SSH を開けず SSM Session Manager で接続**（ポート 22 に依存しない）。SSH を許可する場合も `my_ip` の /32 限定（全開放は変数 validation で禁止）。
- **RDS は private サブネットに隔離**・`publicly_accessible = false`・`storage_encrypted = true`。
- **DB 認証情報は Secrets Manager に保管**（コードに直書きしない。パスワードはランダム生成）。
- **IAM は最小権限**：EC2 ロールの Secrets 読み取りは対象シークレットの ARN のみに限定。
- **ALB は public サブネット 2AZ**・アクセスログを S3 に出力。
- **WAF**（AWS マネージドルール）で SQLi/XSS など一般的な攻撃をブロック。
- **CloudWatch** でアラーム通知＋ EC2 自己修復（システム障害時に自動 recover）。
- **state は S3 ＋ S3 ネイティブロック（`use_lockfile`）**で管理（共有・同時実行の衝突防止）。

## 前提

- Terraform 1.10 以上（1.x 系）
- AWS CLI 設定済み・リージョン ap-northeast-1（東京）

## バージョン選定の根拠

- `required_version = "~> 1.10"`：1.x 系に固定し、将来の 2.0 の破壊的変更を自動で取り込まない（S3 ネイティブの state ロックなど新しめの機能を使うため下限を 1.10 に引き上げ）。
- `aws = "~> 6.0"`：現行メジャーの 6.x に追従し、最新の機能とバグ修正を取り込む。`.terraform.lock.hcl` をコミットして版を確定し、どの環境でも同じ版で動くようにする。新しいメジャー（将来の 7.x など）は安定するまで急いで追従しない方針。

## state バックエンドの準備（最初の 1 回だけ）

state を S3 に保存するため、先に置き場を作ります。これは `bootstrap/` の小さなスタックで行います（このスタック自身は鶏と卵を避けるためローカル state）。`bootstrap/` は state 用の S3 バケット（バージョニング・暗号化・公開遮断・バケットポリシー付き）と、GitHub Actions 用の OIDC プロバイダ／ロールを作成します。

```bash
cd bootstrap
terraform init
terraform apply        # state 用 S3 バケット＋OIDC ロールを作成（ほぼ無料・常設）
```

作成したバケット名を本体の `backend.tf` の `bucket` と一致させます（既定: `aws-study-tfstate-hideharu`）。バケット名は世界で一意のため、必要に応じて変更してください。

> 補足：state のロックは S3 ネイティブロック（`use_lockfile = true`・Terraform 1.10 以上が必要）を採用しています。以前は DynamoDB テーブルでロックするのが一般的でしたが、現在は非推奨のため使いません。

## デプロイ

```bash
terraform init
terraform plan  -var="my_ip=$(curl -s https://checkip.amazonaws.com)/32"
terraform apply -var="my_ip=$(curl -s https://checkip.amazonaws.com)/32"
```

> 既定では **VPC + ALB + EC2** のみを作成します。serverless 層（Lambda / API GW / CloudFront / S3 静的サイト・WAF）と RDS は任意で、`-var="enable_serverless=true"` / `-var="enable_rds=true"` を渡したときだけ作成します（アプリは H2 メモリ DB で動くため RDS は既定 off）。

## 動作確認

```bash
# ALB 経由でアプリにアクセス（200）
curl -s -o /dev/null -w "%{http_code}\n" "http://$(terraform output -raw alb_dns)/posts"

# （enable_serverless=true のとき）XSS 風リクエストは WAF が 403 でブロック
curl -s -o /dev/null -w "%{http_code}\n" "http://$(terraform output -raw alb_dns)/posts?x=<script>alert(1)</script>"

# EC2 へは鍵なしで SSM 接続
aws ssm start-session --target <instance-id>
```

## 破棄

```bash
terraform destroy -var="my_ip=$(curl -s https://checkip.amazonaws.com)/32"
```

> RDS は既定で破棄時に最終スナップショットを残す（`skip_final_snapshot = false`）ため、誤操作によるデータ消失を防げる。学習で一括破棄したい時だけ `-var="skip_final_snapshot=true"` を追加で渡す（この場合は最終スナップショットを作らず削除する）。

> state 置き場（`bootstrap/` の S3・DynamoDB）はほぼ無料なので残してよい。完全に消す場合は `bootstrap/` でも `terraform destroy` を実行する。

## CI/CD（GitHub Actions）

- **CI（`terraform-ci.yml`・PR 時）**：`fmt -check` / `validate` のオフライン検査（必須チェック）と、`terraform test`（plan モード）で構成と安全性を検証する。AWS へは OIDC の読み取り専用ロールで接続する。
- **CD（`app-deploy.yml`・main マージ時 or 手動実行）**：`environment: prod` の承認を経てから、Terraform で環境構築 → Ansible（SSM 接続）でアプリを systemd 起動 → ALB の `/posts` へ `curl` して疎通確認まで行う（承認するまで何も適用しない）。詳細は [../ansible/README.md](../ansible/README.md) を参照。
- 認証は OIDC（短期トークン）で長期アクセスキーは使わない。詳細は [docs/state-management.md](../docs/state-management.md) を参照。

## モジュール構成

| モジュール | 役割 |
|---|---|
| `network` | VPC / 2AZ public+private サブネット / IGW / ルートテーブル |
| `security` | セキュリティグループ 3 種（ALB / EC2 / RDS） |
| `secrets` | DB 認証情報の生成と Secrets Manager 保管 |
| `iam` | EC2 用ロール（SSM / CloudWatch / Secrets 限定読み取り） |
| `database` | RDS MySQL（private・暗号化・`enable_rds=true` のとき） |
| `compute` | EC2（最小 user_data・アプリ配置は Ansible/SSM） |
| `alb` | ALB（public 2AZ）＋ ターゲットグループ ＋ アクセスログ S3 |
| `monitoring` | CloudWatch アラーム（CPU／自己修復）＋ SNS ＋ ロググループ |
| `waf` | WAFv2 Web ACL（マネージドルール）＋ ALB 紐付け |

## コスト注意

ALB と RDS が主なコスト源です。学習・確認が終わったら `terraform destroy` で停止してください。
