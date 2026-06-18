# 本体の state を S3 に保存し、DynamoDB で同時 apply のロックを取る（採点2）。
# ※ backend ブロックは変数を使えない仕様のため、値は直書き。
#   bootstrap で作ったバケット名／テーブル名と一致させること。
terraform {
  backend "s3" {
    bucket         = "aws-study-tfstate-hideharu"
    key            = "capstone/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "aws-study-tflock"
    encrypt        = true
  }
}
