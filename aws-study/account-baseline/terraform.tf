terraform {
  required_version = "~> 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # capstone(aws-study/terraform)と同じバケットだが key を分けて state を独立させる。
  backend "s3" {
    bucket       = "aws-study-tfstate-hideharu"
    key          = "account-baseline/terraform.tfstate"
    region       = "ap-northeast-1"
    use_lockfile = true
    encrypt      = true
  }
}
