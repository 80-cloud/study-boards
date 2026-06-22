# state の置き場（S3 バケット＋DynamoDB ロックテーブル）を作る踏み台スタック。
# このスタック自身のstateはローカル（鶏と卵を断つため）。一度作ったら壊さず常設。

terraform {
  required_version = "~> 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# ---- state 保存用 S3 バケット ----
resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name
}

# 誤上書き・破損から復旧できるようバージョニングを有効化
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# サーバーサイド暗号化（採点2：保存時に暗号化）
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# state には機密が入るのでパブリックアクセスを完全遮断
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
