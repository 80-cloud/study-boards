# 共通の入力変数。

variable "region" {
  description = "デプロイ先リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project" {
  description = "リソース名・タグの接頭辞に使う識別子"
  type        = string
  default     = "aws-study"
}

variable "my_ip" {
  description = "SSH 等を許可する自分の IP（CIDR /32 形式）"
  type        = string

  # 全開放（0.0.0.0/0 など）を設定ミスで入れられないようにする検証。
  # x.x.x.x/32 形式以外は apply/plan の前にエラーで止まる。
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/32$", var.my_ip))
    error_message = "my_ip は x.x.x.x/32 形式で指定してください（0.0.0.0/0 は不可）。"
  }
}

# RDS 破棄時に最終スナップショットを省略するか。既定 false=残す（誤操作でのデータ消失を防ぐ）。
# 学習で一括破棄したい時だけ true を渡す（database モジュールへ受け渡す）。
variable "skip_final_snapshot" {
  type    = bool
  default = false
}
# 任意レイヤの ON/OFF。push パイプラインは VPC＋ALB＋EC2 だけを作るため既定 false。
# true で serverless 一式(Lambda/API GW/CloudFront/S3静的サイト)＋ALB前段のWAFも作る。
variable "enable_serverless" {
  type    = bool
  default = false
}

# RDS(MySQL)を作るか。アプリは H2(メモリDB)で動くため既定 false。
variable "enable_rds" {
  type    = bool
  default = false
}