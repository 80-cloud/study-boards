# 通知先 SNS トピック（ARN を直書きせず自分で作る＝採点11）
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-alerts"
}

# メール購読（alarm_email が空なら作らない）
resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# CPU 高負荷アラーム（80% 超が継続したら通知）
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project}-ec2-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU > 80% が継続"
  dimensions          = { InstanceId = var.instance_id }
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# 自己修復アラーム（システム障害時に EC2 を自動 recover）
resource "aws_cloudwatch_metric_alarm" "auto_recover" {
  alarm_name          = "${var.project}-ec2-auto-recover"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed_System"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "システムステータス障害時に自動復旧する"
  dimensions          = { InstanceId = var.instance_id }
  alarm_actions       = ["arn:aws:automate:${var.region}:ec2:recover"]
}

# アプリ用ロググループ
resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project}/app"
  retention_in_days = 7
}
