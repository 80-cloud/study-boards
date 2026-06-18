# AWS インフラ構成（Terraform）

AWS 上に **VPC / EC2 / RDS / ALB / WAF / CloudWatch** 一式を Terraform でコード化した構成です。
`terraform apply` だけで、ネットワーク作成からアプリ起動・監視・保護までを再現できます。

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
  state: S3 バケット ＋ DynamoDB ロック（bootstrap で作成）
```

## 主な設計方針（セキュリティ・運用）

- **SSH を開けず SSM Session Manager で接続**（ポート 22 に依存しない）。SSH を許可する場合も `my_ip` の /32 限定（全開放は変数 validation で禁止）。
- **RDS は private サブネットに隔離**・`publicly_accessible = false`・`storage_encrypted = true`。
- **DB 認証情報は Secrets Manager に保管**（コードに直書きしない。パスワードはランダム生成）。
- **IAM は最小権限**：EC2 ロールの Secrets 読み取りは対象シークレットの ARN のみに限定。
- **ALB は public サブネット 2AZ**・アクセスログを S3 に出力。
- **WAF**（AWS マネージドルール）で SQLi/XSS など一般的な攻撃をブロック。
- **CloudWatch** でアラーム通知＋ EC2 自己修復（システム障害時に自動 recover）。
- **state は S3 + DynamoDB ロック**で管理（共有・同時実行の衝突防止）。

## 前提

- Terraform 1.5 以上（1.x 系）
- AWS CLI 設定済み・リージョン ap-northeast-1（東京）

## バージョン選定の根拠

- `required_version = "~> 1.5"`：1.x 系に固定し、将来の 2.0 の破壊的変更を自動で取り込まない。
- `aws = "~> 5.0"`：5.x 系に固定。`.terraform.lock.hcl` をコミットしてプロバイダ版を確定し、どの環境でも同じ版で動くようにする。

## state バックエンドの準備（最初の 1 回だけ）

state を S3 に保存するため、先に置き場（S3 バケット＋ DynamoDB テーブル）を作ります。これは `bootstrap/` の小さなスタックで行います（このスタック自身は鶏と卵を避けるためローカル state）。

```bash
cd bootstrap
terraform init
terraform apply        # S3 バケット + DynamoDB テーブルを作成（ほぼ無料・常設）
```

作成したバケット名・テーブル名を本体の `backend.tf` の値と一致させます（既定: `aws-study-tfstate-hideharu` / `aws-study-tflock`）。バケット名は世界で一意のため、必要に応じて変更してください。

> 補足：本バージョンの Terraform では backend の `dynamodb_table` に対し「`use_lockfile`（S3 ネイティブロック）を推奨」という非推奨警告が出ますが、要件に合わせて DynamoDB ロックを採用しています。

## デプロイ

```bash
terraform init
terraform plan  -var="my_ip=$(curl -s https://checkip.amazonaws.com)/32"
terraform apply -var="my_ip=$(curl -s https://checkip.amazonaws.com)/32"
```

## 動作確認

```bash
# ALB 経由でアプリにアクセス（200）
curl -s -o /dev/null -w "%{http_code}\n" "http://$(terraform output -raw alb_dns)/"

# XSS 風リクエストは WAF が 403 でブロック
curl -s -o /dev/null -w "%{http_code}\n" "http://$(terraform output -raw alb_dns)/?x=<script>alert(1)</script>"

# EC2 へは鍵なしで SSM 接続
aws ssm start-session --target <instance-id>
```

## 破棄

```bash
terraform destroy -var="my_ip=$(curl -s https://checkip.amazonaws.com)/32"
```

> state 置き場（`bootstrap/` の S3・DynamoDB）はほぼ無料なので残してよい。完全に消す場合は `bootstrap/` でも `terraform destroy` を実行する。

## モジュール構成

| モジュール | 役割 |
|---|---|
| `network` | VPC / 2AZ public+private サブネット / IGW / ルートテーブル |
| `security` | セキュリティグループ 3 種（ALB / EC2 / RDS） |
| `secrets` | DB 認証情報の生成と Secrets Manager 保管 |
| `iam` | EC2 用ロール（SSM / ECR / CloudWatch / Secrets 限定読み取り） |
| `database` | RDS MySQL（private・暗号化） |
| `compute` | EC2（user_data 自動デプロイ・SSM 接続） |
| `alb` | ALB（public 2AZ）＋ ターゲットグループ ＋ アクセスログ S3 |
| `monitoring` | CloudWatch アラーム（CPU／自己修復）＋ SNS ＋ ロググループ |
| `waf` | WAFv2 Web ACL（マネージドルール）＋ ALB 紐付け |

## コスト注意

ALB と RDS が主なコスト源です。学習・確認が終わったら `terraform destroy` で停止してください。
