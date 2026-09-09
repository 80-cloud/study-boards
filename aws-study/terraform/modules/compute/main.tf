# 最新の Amazon Linux 2023 標準版（x86_64）を自動取得（AMI ID を直書きしない）。
# 「al2023-ami-2023.*」で標準版に限定（minimal 版は SSM agent/python3 が無く SSM デプロイ不可）。
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_instance" "this" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.ec2_sg_id]
  iam_instance_profile   = var.instance_profile_name # SSM/ECR/Secrets を付与（鍵は使わない）

  # 起動スクリプト（変数を差し込んで生成）
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region    = var.region
    secret_id = var.secret_id
  })

  root_block_device {
    volume_size = 30 # Docker 用に拡張
  }
  tags = { Name = "${var.project}-ec2" }
}
