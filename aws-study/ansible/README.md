# アプリ自動デプロイ（Ansible × SSM）

`main` への push をトリガに、GitHub Actions が **Terraform で環境構築 → Ansible（SSM 接続）で Spring Boot アプリを systemd 起動 → ALB 経由で疎通確認** までを 1 本のワークフロー（`.github/workflows/app-deploy.yml`）で自動化します。

## 全体の流れ

```
push (main) ─→ app-deploy.yml（environment: prod 承認ゲート）
  1. review-park(private) を PAT で checkout
  2. runner で bootJar（app.jar）をビルド ← EC2 ではビルドしない（OOM 回避）
  3. OIDC で apply ロールを assume
  4. terraform apply（VPC + ALB + EC2 のみ。serverless/RDS は既定 off）
  5. SSM が Online になるまで待機
  6. ansible-playbook（SSM 接続）で配置・systemd 起動
  7. ALB DNS の /posts が 200 を返すか確認
```

破棄（片付け）はワークフローに含めず、本人が手動で実施します。

## SSM 接続（鍵なし・22 番を開けない）

- 接続方式は `inventory/hosts.ini` の `ansible_connection: amazon.aws.aws_ssm`。ホストは IP ではなく **インスタンス ID**（`ansible_aws_ssm_instance_id`）。
- runner 側の前提：`session-manager-plugin`・`boto3`/`botocore`・`amazon.aws` コレクション（`requirements.yml`）。
- **ファイル転送用 S3 バケット**：runner が presigned URL を作り SSM 経由で渡すため、中継 S3（`aws-study-ssm-transfer-*`・SSE 有効）を使う（`ansible_aws_ssm_bucket_sse_mode: AES256`）。
- **EC2 側に S3 権限は不要**（controller が presigned URL を生成）。EC2 は `AmazonSSMManagedInstanceCore` だけで接続できる。

### SSM が成立する 3 条件（採点ポイント）
1. **インスタンスプロファイルに `AmazonSSMManagedInstanceCore`**（`modules/iam`／outputs の `instance_profile_name`・`ec2_role_arn`／`tests/security.tftest.hcl` で担保）。
2. **AMI に SSM Agent 同梱**：Amazon Linux 2023 は標準で同梱・自動起動。
3. **EC2 → SSM への到達**：public サブネット＋egress 許可で到達（NAT / VPC エンドポイント不要）。

## OIDC（長期キーを使わない）

- GitHub Actions は OIDC で AWS の **apply ロール**（`environment:prod` の sub 条件付き）を assume する。長期アクセスキーは保存しない。
- 承認ゲート：`environment: prod` の required reviewers でジョブ開始前に停止し、承認するまで何も作らない。

### 必要な Secrets（study-boards リポジトリ）
| 名前 | 用途 |
|---|---|
| `AWS_APPLY_ROLE_ARN` | OIDC で assume する apply ロール ARN |
| `MY_IP_CIDR` | `my_ip` 変数（/32） |
| `REVIEW_PARK_PAT` | private な review-park を checkout する読み取り PAT（Contents: Read） |

## 機密の受け渡し（JWT）

- アプリの `JWT_SECRET` は Secrets Manager（`aws-study-db-credentials` の `jwt_secret`）に保管。
- Ansible（controller）が取得 → EC2 の `/etc/app/app.env`（0600）に展開 → systemd の `EnvironmentFile` で注入。コマンド引数や環境変数の直接渡しはしない（`no_log: true`）。

## 起動手順（再現）

1. `bootstrap/` を一度だけ apply（OIDC ロール・state バケット）。
2. 上記 Secrets を登録。
3. review-park 側の変更（あれば）を main へ merge。
4. study-boards の `main` へ push（または Actions から `app-deploy` を手動実行）。
5. `prod` 環境を承認（Review deployments）。
6. 自動で apply → Ansible → ALB `/posts` が 200。
7. 確認後、本人が手動で破棄（片付け）。

## Java バージョンの変更（部分変更の実演）

`java_version`（`inventory/group_vars/all.yml`）・`app-deploy.yml` の `setup-java`・review-park 側 `build.gradle` の toolchain・Gradle wrapper を揃えて変更する（21 → 25 など）。
