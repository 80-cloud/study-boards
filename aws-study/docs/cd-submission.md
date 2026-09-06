# Terraform を GitHub Actions で CD 化

AWS インフラ（VPC / EC2 / RDS / ALB / CloudFront / Lambda / API Gateway / WAF 等）の Terraform を、GitHub Actions で検査（CI）し、承認を経て自動 apply（CD）する仕組みを構築した。

## 構成

- **CI（`.github/workflows/terraform-ci.yml`・PR 時）**
  - `terraform-validate`：`fmt -check` / `init -backend=false` / `validate`（AWS 不要・必須チェック）
  - `terraform-test`：`terraform test`（plan モード・11 ケース。ALB / SG / ターゲットグループのポートや SSH 制限を検証）
- **CD（`.github/workflows/terraform-cd.yml`・main マージ時）**
  - トリガ：`aws-study/terraform/**` の変更が main に入った時
  - `environment: prod` の承認ゲート（承認するまで apply しない）
  - OIDC apply ロールで認証 → `plan -out=tfplan` → `apply tfplan`（同一ジョブ）→ ALB へ `curl` で反映確認

## 認証・セキュリティ

- **OIDC（短期トークン）**で認証し、長期アクセスキーは使わない
- **plan / apply ロールを分離**：PR / main は読み取り専用、変更は prod 環境からのみ
- **最小権限**：IAM は `aws-study-*` に限定、他サービスは動詞ファミリ＋東京リージョン条件
- **state**：S3 ＋ S3 ネイティブロック＋暗号化、バケットは公開遮断＋ポリシー（TLS 必須・他アカウント拒否）
- ALB-SG = 80/443、EC2 の SSH = 自分の IP(/32) のみ、RDS は private ＋暗号化

## 実証（テスト → 自動構築 → 変更 → 再CD → 反映）

- フル構築（53 リソース）apply 成功 → ALB が 200
- CloudWatch アラームしきい値 80 → 70 を変更 → CD で反映（`> 70`）
- CD run（証跡）:
  - 自動構築: https://github.com/80-cloud/study-boards/actions/runs/27991809362
  - 変更反映: https://github.com/80-cloud/study-boards/actions/runs/27993416690

## 関連 PR

- #596 CI と OIDC 認証基盤
- #599 CD ワークフロー
- #601 運用ドキュメント
- #603 変更 → 反映デモ（しきい値変更）
- #605 apply ロールの権限修正

（証跡スクリーンショットは本 PR の説明に添付）