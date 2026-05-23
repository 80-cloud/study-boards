# =====================================================================
# budgets.tf — コスト防御（月次しきい値で通知）
# =====================================================================
# 無料枠運用の早期検知。実コスト・予測コストの両方で通知する（超過の兆候を先に掴む）。
# =====================================================================

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # 実コストがしきい値の 80% に達したら通知
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notify_email]
  }

  # 予測コストがしきい値の 100% を超える見込みで通知（先回り）
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_notify_email]
  }
}
