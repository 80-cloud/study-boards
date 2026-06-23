# Ansible 対象 EC2 用の最小 Terraform（capstone とは別ルート・別 state）。
# state は capstone と同じ S3 バケットに置くが key を分けて混ぜない（採点の state 分離と同じ考え方）。
# WF が apply したあと EC2 を残し、destroy は本人がローカルで実行する設計なので、
# state はローカルではなく必ずリモート（S3）に置く必要がある（runner が消えても state が残る）。
terraform {
  required_version = "~> 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "aws-study-tfstate-hideharu"
    key          = "ansible/terraform.tfstate"
    region       = "ap-northeast-1"
    use_lockfile = true
    encrypt      = true
  }
}
