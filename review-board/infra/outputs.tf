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

output "ssm_parameter_prefix" {
  description = "アプリが読む SSM パラメータのプレフィックス"
  value       = local.ssm_prefix
}
