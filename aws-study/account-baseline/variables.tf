variable "region" {
  description = "デプロイ先リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project" {
  description = "リソース名の接頭辞に使う識別子"
  type        = string
  default     = "aws-study"
}

variable "account_alias" {
  description = "サインインURLに使うアカウントエイリアス。実名・アカウント番号・案件名は避ける。"
  type        = string

  # 小文字英数字とハイフンのみ・3〜63文字（IAMの制約に合わせる）
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.account_alias))
    error_message = "account_alias は小文字英数字とハイフンのみ、3〜63文字で指定してください。"
  }
}
