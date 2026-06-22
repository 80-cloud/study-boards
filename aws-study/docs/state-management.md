# state と CI/CD の運用

Terraform の state 管理、および GitHub Actions による検査・デプロイの運用をまとめる。

## state バックエンド

- 保存先：S3 バケット `aws-study-tfstate-hideharu`、キー `capstone/terraform.tfstate`
- ロック：S3 ネイティブロック（`use_lockfile = true`）で同時 apply の競合を防ぐ（DynamoDB は使わない）
- 暗号化：`encrypt = true`（保存時に暗号化）
- 置き場の作成：`bootstrap/` スタックで一度だけ作る（このスタック自身は鶏と卵を避けるためローカル state）。state バケットには `aws_s3_bucket_policy` で「TLS 必須・このアカウント以外は拒否」を付け、Public Access Block と二重で保護する。

## GitHub Actions の認証（OIDC）

長期アクセスキーを Secrets に置かず、OIDC（短期トークン）で AWS を認証する。`bootstrap/oidc.tf` で OIDC プロバイダと 2 つのロールを作る。

| ロール | assume できる条件 | 権限 |
|---|---|---|
| `aws-study-tf-plan` | PR / main から | 読み取り専用（ReadOnlyAccess）＋ state ロックの書き込み |
| `aws-study-tf-apply` | `environment: prod` から | 変更可（下記の最小権限） |

- **plan と apply を分離**：PR や main では読み取りだけ（壊せない）。変更できるのは prod 環境を通った実行のみ。
- apply ロールの権限は最小化：IAM は `aws-study-*` のロール／インスタンスプロファイルに限定＋ PassRole、他サービスは動詞ファミリ（`Describe*`/`Create*`/`Delete*`/`Modify*` など）＋東京リージョン条件で絞る。広い `*:*` は使わない。
- 信頼条件：`aud` は `sts.amazonaws.com`、`sub` は plan が `pull_request` / `ref:refs/heads/main`、apply が `environment:prod`。

## CI（terraform-ci.yml・PR 時）

- `terraform-validate`：`fmt -check` / `init -backend=false` / `validate`。AWS 不要のオフライン検査で、全 PR で走り常に通る（必須チェック）。
- `terraform-test`：plan ロールで `terraform test`（plan モード）。ALB／SG／ターゲットグループのポートや SSH 制限などをコード上で検証する。

## CD（terraform-cd.yml・main マージ時）

- トリガ：main への push（`aws-study/terraform/**` が変わった時だけ）。
- 承認ゲート：`environment: prod` の required reviewers。承認するまで apply は走らない。
- 流れ：apply ロールを assume → `plan -out=tfplan` → `apply tfplan` を**同一ジョブ**で実行 → ALB の DNS に `curl` して反映を確認。
- 承認者：リポジトリ管理者（本人）。

### plan を artifact にしない理由

このリポジトリは公開設定で、plan ファイルは state や変数の値を含む。公開リポの artifact は誰でもダウンロードできるため、plan を artifact 化して別ジョブに渡す方式は使わず、**1 つのジョブの中で `plan -out` → `apply` まで完結**させる。これで保存した plan をそのまま適用しつつ、plan を外に出さない。

## 版の固定

- Terraform：CI/CD は `1.15.2` に固定（ローカルも同じ版に合わせる）。`required_version = "~> 1.10"`。
- AWS provider：`~> 6.0` ＋ `.terraform.lock.hcl` をコミットして確定。
- GitHub Actions：各 action を 40 桁の commit SHA で固定（タグ差し替えによる予期せぬ変更を防ぐ）。

## ネットワーク／SG 構成（要点）

- ALB：internet-facing・public 2AZ。ALB SG は 80／443 のみ。
- EC2 SG：アプリ 8080 は ALB SG からのみ、SSH 22 は `my_ip`（/32）からのみ。
- ターゲットグループ：ポート 8080（アプリと一致）。
