variable "region" {
  type    = string
  default = "ap-northeast-1"
}

# S3 バケット名は世界で一意。取られていたら末尾に数字等を足して変更可。
variable "state_bucket_name" {
  type    = string
  default = "aws-study-tfstate-hideharu"
}
