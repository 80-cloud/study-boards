# =====================================================================
# network.tf — VPC / サブネット / ルーティング / セキュリティグループ
# =====================================================================
# EC2 は public（web 終端）、RDS は private（EC2 SG からのみ到達）。最小露出。
# =====================================================================

# 理由: 学習用途のため VPC Flow Logs は未有効化（CloudWatch Logs 課金回避）。
#       本格運用フェーズで有効化する。
#tfsec:ignore:aws-ec2-require-vpc-flow-logs-for-all-vpcs
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name_prefix}-vpc" }
}

# --- パブリックサブネット（EC2） ---
# 理由: Web サーバ用途のためパブリック IP が必要。private + NAT は無料枠超過につながる。
#tfsec:ignore:aws-ec2-no-public-ip-subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone_a
  map_public_ip_on_launch = true

  tags = { Name = "${local.name_prefix}-public" }
}

# --- プライベートサブネット x2（RDS。Subnet Group は2AZ必須） ---
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_a_cidr
  availability_zone = var.availability_zone_a

  tags = { Name = "${local.name_prefix}-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_b_cidr
  availability_zone = var.availability_zone_b

  tags = { Name = "${local.name_prefix}-private-b" }
}

# --- Internet Gateway + ルート（public のみ外向き） ---
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${local.name_prefix}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# private サブネットは外向きルート無し（RDS はインターネット非到達）。

# ---------------------------------------------------------------------
# EC2 用 SG：80/443 は web 公開、22 は自宅 IP のみ。
# ---------------------------------------------------------------------
# 理由: nginx が 80/443 を終端し受講生ブラウザへ配信するため web は世界公開（学習）。
#       backend(8082) は EC2 内部のみで SG では開けない。
#tfsec:ignore:aws-ec2-no-public-ingress-sgr
#tfsec:ignore:aws-ec2-no-public-egress-sgr
resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "review-board EC2: web(80/443) world, ssh(22) my IP only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP (nginx)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS (nginx, Let's Encrypt)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from my IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  egress {
    description = "All outbound (OS update / S3 / ACME)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-ec2-sg" }
}

# ---------------------------------------------------------------------
# RDS 用 SG：5432 は EC2 SG からのみ（IP では開けない＝最小露出）。
# ---------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "review-board RDS: PostgreSQL only from EC2 SG"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2 SG only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  tags = { Name = "${local.name_prefix}-rds-sg" }
}
