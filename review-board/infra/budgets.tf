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

  # 多段の実コスト通知（無料枠運用は本来 $0＝最初の課金を最速で掴む。修練城の事故予防方針）。
  # しきい値 $0.50 に対し 1%=$0.005 / 50%=$0.25 / 80%=$0.40 / 100%=$0.50。
  # 1% は実質「最初の課金（数セント）」の検知点。暴走コストの兆候を早期に通知する。
  dynamic "notification" {
    for_each = toset([1, 50, 80, 100])
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_notify_email]
    }
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
