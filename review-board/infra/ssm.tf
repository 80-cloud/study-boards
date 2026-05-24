# =====================================================================
# ssm.tf — 機密の SSM Parameter Store（SecureString）
# =====================================================================
# 平文ハードコード禁止（SEC-9）。EC2 はインスタンスロール経由でのみ復号読み取り可。
# 値は tfvars（.gitignore）由来。tfstate に入るため tfstate も機密扱い。
# =====================================================================

locals {
  ssm_prefix = "/${var.project_name}/${var.environment}"
}

# JWT 署名鍵（HS256・256bit 以上）
resource "aws_ssm_parameter" "jwt_secret" {
  name        = "${local.ssm_prefix}/JWT_SECRET"
  description = "review-board JWT signing secret (HS256)"
  type        = "SecureString"
  value       = var.jwt_secret

  tags = { Name = "${local.name_prefix}-jwt-secret" }
}

# DB パスワード（RDS と同じ値。アプリ起動時に DATABASE_PASSWORD として注入）
resource "aws_ssm_parameter" "db_password" {
  name        = "${local.ssm_prefix}/DATABASE_PASSWORD"
  description = "review-board RDS master password"
  type        = "SecureString"
  value       = var.db_password

  tags = { Name = "${local.name_prefix}-db-password" }
}

# DB 接続情報（機密ではないが運用集約のため SSM に置く）
resource "aws_ssm_parameter" "db_url" {
  name        = "${local.ssm_prefix}/DATABASE_URL"
  description = "review-board JDBC URL"
  type        = "String"
  value       = "jdbc:postgresql://${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}"

  tags = { Name = "${local.name_prefix}-db-url" }
}

# 画像保存先（本番＝実 S3）。provision.sh が EnvironmentFile に S3_BUCKET として展開する。
resource "aws_ssm_parameter" "s3_bucket" {
  name        = "${local.ssm_prefix}/S3_BUCKET"
  description = "review-board screenshots bucket name"
  type        = "String"
  value       = aws_s3_bucket.screenshots.bucket

  tags = { Name = "${local.name_prefix}-s3-bucket" }
}

# CD アーティファクト配布バケット。deploy.sh が s3://<artifacts>/<sha>/ から取得する。
resource "aws_ssm_parameter" "artifacts_bucket" {
  name        = "${local.ssm_prefix}/ARTIFACTS_BUCKET"
  description = "review-board CD artifacts bucket name"
  type        = "String"
  value       = aws_s3_bucket.artifacts.bucket

  tags = { Name = "${local.name_prefix}-artifacts-bucket" }
}

# 初代管理者の bootstrap（任意）。password が空なら作成しない（AdminBootstrap も未設定で skip）。
resource "aws_ssm_parameter" "bootstrap_admin_email" {
  count       = var.bootstrap_admin_password != "" ? 1 : 0
  name        = "${local.ssm_prefix}/BOOTSTRAP_ADMIN_EMAIL"
  description = "review-board initial admin email"
  type        = "String"
  value       = var.bootstrap_admin_email

  tags = { Name = "${local.name_prefix}-bootstrap-admin-email" }
}

resource "aws_ssm_parameter" "bootstrap_admin_password" {
  count       = var.bootstrap_admin_password != "" ? 1 : 0
  name        = "${local.ssm_prefix}/BOOTSTRAP_ADMIN_PASSWORD"
  description = "review-board initial admin password"
  type        = "SecureString"
  value       = var.bootstrap_admin_password

  tags = { Name = "${local.name_prefix}-bootstrap-admin-password" }
}
