output "ec2_public_ip" {
  description = "inventory に差し込む対象 EC2 の公開 IP。"
  value       = aws_instance.target.public_ip
}

output "instance_id" {
  description = "対象 EC2 のインスタンス ID。"
  value       = aws_instance.target.id
}

output "security_group_id" {
  description = "ランナー IP を一時 authorize/revoke するための SG ID。"
  value       = aws_security_group.ssh.id
}
