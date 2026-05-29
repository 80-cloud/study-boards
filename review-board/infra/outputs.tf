# =====================================================================
# outputs.tf — apply 後に表示する値（apply 前は未デプロイのため未確定）
# =====================================================================

output "ec2_public_ip" {
  description = "EC2 の固定パブリック IP（EIP）"
  value       = aws_eip.app.public_ip
}

output "ec2_public_dns" {
  description = "EC2 のパブリック DNS"
  value       = aws_instance.app.public_dns
}

output "ssh_command" {
  description = "EC2 への SSH コマンド"
  value       = "ssh -i ${replace(var.ssh_public_key_path, ".pub", "")} ec2-user@${aws_eip.app.public_ip}"
}

output "rds_address" {
  description = "RDS ホスト名（EC2 内からのみ到達可）"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS ポート"
  value       = aws_db_instance.main.port
}

output "s3_screenshot_bucket" {
  description = "スクショ用 S3 バケット名（非公開）"
  value       = aws_s3_bucket.screenshots.bucket
}

output "artifacts_bucket" {
  description = "CD アーティファクト配布バケット名（cd-build の S3 push 先）"
  value       = aws_s3_bucket.artifacts.bucket
}

output "ssm_parameter_prefix" {
  description = "アプリが読む SSM パラメータのプレフィックス"
  value       = local.ssm_prefix
}

# --- CD 用 CI ユーザーの鍵（GitHub Secret RB_CD_AWS_* に設定する・#198）---
# 取得: terraform output -raw cd_aws_access_key_id / cd_aws_secret_access_key
output "cd_aws_access_key_id" {
  description = "github-actions-cd のアクセスキー ID（GitHub Secret RB_CD_AWS_ACCESS_KEY_ID へ）"
  value       = aws_iam_access_key.github_actions_cd.id
}

output "cd_aws_secret_access_key" {
  description = "github-actions-cd のシークレット（GitHub Secret RB_CD_AWS_SECRET_ACCESS_KEY へ）"
  value       = aws_iam_access_key.github_actions_cd.secret
  sensitive   = true
}

# --- CloudWatch アラート通知用 SNS トピック ARN（将来の Lambda / Slack 連携用・#480）---
output "alerts_topic_arn" {
  description = "CloudWatch アラート通知 SNS トピック ARN（Slack / PagerDuty 連携時の接続先）"
  value       = aws_sns_topic.alerts.arn
}
