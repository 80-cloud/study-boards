resource "aws_wafv2_web_acl" "this" {
  name  = "${var.project}-web-acl"
  scope = "REGIONAL" # ALB は REGIONAL

  # 既定は許可。ルールに当たったものだけブロック
  default_action {
    allow {}
  }

  # AWS マネージドルール（一般的な脅威＝XSS/不正リクエスト等をまとめて防ぐ）
  rule {
    name     = "common-rules"
    priority = 1

    override_action {
      none {} # ルール側の設定（多くは block）に従う
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-common"
      sampled_requests_enabled   = true
    }
  }

  # Web ACL 全体のメトリクス設定
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-web-acl"
    sampled_requests_enabled   = true
  }
}

# 作った Web ACL を ALB に紐付け
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.this.arn
}
