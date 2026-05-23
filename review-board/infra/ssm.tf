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
