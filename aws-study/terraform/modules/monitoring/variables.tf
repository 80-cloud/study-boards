variable "project" { type = string }
variable "region" { type = string }
variable "instance_id" { type = string }

# 通知メール（空なら購読を作らない＝アカウント依存値を必須化しない）
variable "alarm_email" {
  type    = string
  default = ""
}
