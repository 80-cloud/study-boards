# 利用可能な AZ を自動取得（[0]=1a, [1]=1c のように 2 つ使う）
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC（10.0.0.0/16 の専用ネットワーク）
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-vpc" }
}

# インターネットゲートウェイ（VPC の外部接続の出入口）
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.project}-igw" }
}

# public サブネット（2AZ・起動時に公開 IP を自動付与）
# count でリストの数だけ作る。count.index が 0,1 と回る。
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project}-public-${count.index}" }
}

# private サブネット（2AZ・RDS 用・公開 IP なし）
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-private-${count.index}" }
}

# public 用ルートテーブル（0.0.0.0/0 → IGW で外に出る）
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = { Name = "${var.project}-public-rt" }
}

# public サブネットを public ルートテーブルに関連付け
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
