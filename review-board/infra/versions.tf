# =====================================================================
# versions.tf — Terraform / プロバイダのバージョンと共通設定
# =====================================================================
# review-board の AWS インフラ（インフラ構成.md を正とする IaC 実体）。
# 本ディレクトリは「デプロイ到達前」の状態：plan/apply は人間承認まで実行しない
# （CLAUDE.md §6/§12・多層防御 階層4）。
# =====================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # 全リソースに共通タグを自動付与（誤削除防止・コスト分析）。
  default_tags {
    tags = local.common_tags
  }
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  name_prefix = "${var.project_name}-${var.environment}"
}
