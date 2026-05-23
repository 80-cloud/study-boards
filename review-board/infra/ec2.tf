# =====================================================================
# ec2.tf — AMI / Key Pair / EC2 インスタンス / EIP
# =====================================================================
# nginx(443/80) で web を終端し React 静的を配信、/api/* を内部 backend(8082) に渡す。
# アプリ本体(jar/静的)・nginx 設定・TLS 証明書は Terraform 管理外（インフラ構成.md §7）。
# =====================================================================

# 最新の Amazon Linux 2023（AMI ID はリージョン・時期で変わるためハードコードしない）
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

resource "aws_key_pair" "main" {
  key_name   = "${local.name_prefix}-key"
  public_key = file(pathexpand(var.ssh_public_key_path))

  tags = { Name = "${local.name_prefix}-key" }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = aws_key_pair.main.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_tokens   = "required" # IMDSv2 強制
    http_endpoint = "enabled"
  }

  # ランタイム基盤（nginx / Java / certbot）のみ。アプリ配置は別手順（デプロイスクリプト）。
  user_data                   = file("${path.module}/user_data.sh")
  user_data_replace_on_change = true

  tags = { Name = "${local.name_prefix}-ec2" }
}

# 停止/起動で変わらない固定 IP（EC2 にアタッチして使う限り無料）
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = { Name = "${local.name_prefix}-eip" }

  depends_on = [aws_internet_gateway.main]
}
