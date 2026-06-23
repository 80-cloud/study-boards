provider "aws" {
  region = "ap-northeast-1"
}

# default VPC とその subnet を data で取得（自前 VPC を作らず最小構成にする）。
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# AL2023 の最新 AMI を data で取得（ID ベタ書き禁止）。
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# SSH 用 SG。22 は自分の IP のみ（ランナー IP は WF が実行時に一時 authorize/revoke する）。
resource "aws_security_group" "ssh" {
  name        = "${var.project}-ansible-sg"
  description = "SSH for Ansible target (my_ip only; runner IP added at runtime)"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from my_ip"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    description = "all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-ansible-sg"
  }
}

# 対象 EC2。user_data なしの「素の AL2023」＝Java は playbook だけで入れる（before/after を見せられる）。
resource "aws_instance" "target" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  subnet_id                   = data.aws_subnets.default.ids[0]
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.ssh.id]
  key_name                    = var.key_name

  tags = {
    Name = "${var.project}-ansible-target"
  }
}
