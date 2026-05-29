# =====================================================================
# cloudwatch.tf — 障害検知用 CloudWatch アラーム（EC2 + RDS）
# =====================================================================
# Issue #480 / 引き継ぎ書 #6：設計書（ログ・監視・障害対応設計書.md）と
# 実装の乖離を埋める。本構成は EC2 単体（ALB / ECS 無し）であり、引き継ぎ書の
# 「ALB 5xx」「ECS 健全性」を EC2/RDS 寄りに置換した 5 アラームを定義する。
# 通知先は sns.tf の aws_sns_topic.alerts（購読は budget_notify_email）。
# =====================================================================

# --- EC2: インスタンス自体の障害（ハイパーバイザ／ネット）---
# StatusCheckFailed は 0/1 で出るので「1 期間中に 1 度でも 1」を異常とする。
resource "aws_cloudwatch_metric_alarm" "ec2_status_check_failed" {
  alarm_name          = "${local.name_prefix}-ec2-status-check-failed"
  alarm_description   = "EC2 インスタンスのステータスチェックが失敗した（ハードウェア／ネット障害）。"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "breaching"

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- EC2: 過負荷の早期検知 ---
resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  alarm_name          = "${local.name_prefix}-ec2-cpu-high"
  alarm_description   = "EC2 の CPU 使用率が 80% を超過（3 期間連続）。"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- RDS: 過負荷の早期検知 ---
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  alarm_description   = "RDS の CPU 使用率が 80% を超過（3 期間連続）。"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- RDS: 残ストレージ枯渇 ---
# 単位は Byte。1 GB = 1,073,741,824。
resource "aws_cloudwatch_metric_alarm" "rds_free_storage_low" {
  alarm_name          = "${local.name_prefix}-rds-free-storage-low"
  alarm_description   = "RDS の空きストレージが 1GB を下回った（無料枠 20GB の 5% 相当）。"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Minimum"
  threshold           = 1073741824
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- RDS: 接続数の枯渇予兆 ---
# t3.micro の max_connections は ~80。80% = 64 を閾値にする（インスタンス変更時は要見直し）。
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${local.name_prefix}-rds-connections-high"
  alarm_description   = "RDS の接続数が max_connections の 80% を継続超過（プールリークの可能性）。"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 64
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
