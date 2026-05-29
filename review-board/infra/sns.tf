# =====================================================================
# sns.tf — CloudWatch アラーム通知トピック
# =====================================================================
# Issue #480 / 引き継ぎ書 #6：cloudwatch.tf の alarm_actions の宛先。
# 購読先は Budgets と同じ `var.budget_notify_email`（運用宛先の単一化）。
# 将来 Lambda 経由 Slack や PagerDuty 連携に差し替えるとき、
# 各 alarm の alarm_actions は触らず、購読側だけ追加できる構造。
# =====================================================================

# tfsec:ignore:aws-sns-enable-topic-encryption トピックは平文の通知メタのみ・KMS は本格運用フェーズで追加
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  tags = {
    Name    = "${local.name_prefix}-alerts"
    Purpose = "CloudWatch alerts → email"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.budget_notify_email
}
