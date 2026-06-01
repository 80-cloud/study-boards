# =====================================================================
# rds.tf — RDS PostgreSQL（private・最小露出・★多層の削除保護）
# =====================================================================
# review-board は セキュリティが突出点。DB は最重要資産のため task-board より強く守る：
#   - deletion_protection = true（AWS 側の削除保護）
#   - lifecycle.prevent_destroy = true（Terraform 側の削除保護）
#   - skip_final_snapshot = false（破棄時に最終スナップショットを必ず取得）
# 共通設計方針 §13-1「Terraform で本番DB(バックアップ含む)を全削除」事故の予防（多層防御 階層2）。
# =====================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

# 理由（学習スコープで意図的に簡素化・Phase 本格運用で対応）：
#   - performance_insights: 追加課金回避
#   - iam_database_authentication: 当面はパスワード認証（SSM 管理）
#tfsec:ignore:aws-rds-enable-performance-insights
#tfsec:ignore:aws-rds-enable-iam-auth
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage # 自動拡張無効（無料枠超過防止）
  storage_type          = "gp3"
  storage_encrypted     = true # 保管時暗号化

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password # tfstate に入るため tfstate は機密扱い（.gitignore）
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false # インターネット非到達（EC2 SG からのみ）
  multi_az               = false # Single-AZ（無料枠条件・冗長化は本格運用フェーズ＝S-2）

  # バックアップ：自動バックアップを保持（破棄時は最終スナップショット）。
  # 新 AWS Free プランは保持期間に上限があり 7 日だと FreeTierRestrictionError。
  # 無料枠準拠で 1 日に短縮（本格運用フェーズで延長）。
  backup_retention_period   = 1
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-db-final"
  copy_tags_to_snapshot     = true

  # 監査ログを CloudWatch へ（運用診断・否認対策の延長）
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # AWS 側削除保護（多層防御 階層2）
  deletion_protection = true

  # Terraform 側削除保護：terraform destroy をエラーで止める。
  # 正規の削除手順（インフラ構成.md §8）：
  #   prevent_destroy=false に変更 → apply（lifecycle のみ）→ deletion_protection も false に
  #   → apply → destroy → 完了後に両方を戻す。「ワンコマンドで destroy できない」を既定にする。
  #   ※ prevent_destroy は変数で制御できない（Terraform 仕様）。
  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "${local.name_prefix}-db" }
}
