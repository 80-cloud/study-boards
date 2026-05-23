# review-board infra（Terraform）

AWS デプロイ用の IaC（[インフラ構成.md](../docs/インフラ構成.md) を正とする実体）。
判定表 **S-2 / S-7 / M-14** に対応。

> **状態：デプロイ到達前（未 apply）。** 本ディレクトリのコード作成とローカル検証までが完了済み。
> `terraform plan`（AWS 接続）・`apply`（デプロイ）は **人間の明示承認をはさんでから**実行する
> （CLAUDE.md §6/§12・多層防御 階層4）。AI 単独で apply/destroy を完結させない。

## 構成（ファイル）

| ファイル | 内容 |
|---|---|
| `versions.tf` | Terraform/AWS プロバイダ・共通タグ |
| `variables.tf` | 変数（既定は無料枠・ap-northeast-1） |
| `network.tf` | VPC・public/private×2 サブネット・IGW・ルート・SG（EC2 80/443+SSH自宅、RDS は EC2 SG のみ） |
| `ec2.tf` | AL2023 AMI・Key Pair・EC2(t3.micro・IMDSv2・暗号化EBS)・EIP |
| `rds.tf` | RDS PostgreSQL（private・暗号化・**deletion_protection + prevent_destroy + 最終スナップショット**） |
| `s3.tf` | スクショ用バケット（非公開・public access block・暗号化・SSL 強制・版管理） |
| `ssm.tf` | 機密の SecureString（JWT_SECRET / DATABASE_PASSWORD / DATABASE_URL） |
| `iam.tf` | EC2 インスタンスロール（当該 S3 と自 SSM パラメータのみ＝最小権限） |
| `budgets.tf` | 月次コスト通知（実績80%・予測100%） |
| `outputs.tf` | EIP・RDS・S3・SSM プレフィックス |
| `user_data.sh` | EC2 土台（swap・Java25・nginx・SSM Agent）。アプリ配置は管理外 |

## 前提

- Terraform >= 1.5、AWS CLI、対象アカウントの認証（最小権限の IAM ユーザー/ロール）。
- SSH 公開鍵（既定 `~/.ssh/aws-review-board.pub`）。無ければ `ssh-keygen -t ed25519 -f ~/.ssh/aws-review-board`。

## 手順（デプロイ＝plan 以降は承認後）

```bash
cd review-board/infra
cp terraform.tfvars.example terraform.tfvars   # 実値を記入（機密・gitignore 済）

terraform init           # プロバイダ取得（ローカル・AWS 非接触）
terraform fmt -check
terraform validate       # 構文・整合（ローカル）

# ↓ ここから AWS に接続する。人間承認をはさむ。
terraform plan           # 差分確認：意図しない destroy が無いことを必ず確認（§12-4）
terraform apply          # 承認後にデプロイ
```

## 安全装置（多層防御）

- **RDS は二重保護**：`deletion_protection=true`（AWS）＋ `lifecycle.prevent_destroy=true`（Terraform）。`terraform destroy` はエラーで止まる。正規削除手順は [インフラ構成.md §8](../docs/インフラ構成.md)。
- **機密は state/tfvars のみ**：`terraform.tfvars`・`*.tfstate` は `.gitignore`。コミット禁止。
- **SSH は自宅 IP のみ**：`my_ip_cidr=0.0.0.0/0` は `validation` で拒否。
- **無料枠固定**：t3.micro / db.t3.micro / 20GB。Budgets で超過を通知。
- **最小権限 IAM**：EC2 は当該 S3 と自 SSM だけ。静的アクセスキーを置かない（インスタンスロール）。

## デプロイ前監査（CLAUDE.md §12-4）

```bash
terraform fmt -check && terraform validate
tflint
tfsec .
grep -rEn "(password|secret|api[_-]?key)\s*=\s*\"" *.tf   # 平文機密が無いこと（tfvars は除外）
```

## 撤収

- 一時停止：RDS 停止（AWS 仕様で7日後に自動再起動 → family の `rds-auto-stop.yml` 方式で再停止）。
- 解体：`prevent_destroy` と `deletion_protection` を外す → apply → destroy（**人間承認必須**）。
