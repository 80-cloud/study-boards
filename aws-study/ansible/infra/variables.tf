variable "my_ip" {
  description = "SSH を許可する自分の IP（/32）。CI ランナーの IP は実行時に別途一時開放する。"
  type        = string

  validation {
    condition     = can(cidrhost(var.my_ip, 0)) && endswith(var.my_ip, "/32")
    error_message = "my_ip は単一ホストの CIDR（例: 203.0.113.10/32）で指定すること。"
  }
}

variable "project" {
  description = "リソース名の接頭辞（apply ロールの最小権限が aws-study-* 限定のため固定）。"
  type        = string
  default     = "aws-study"
}

variable "key_name" {
  description = "EC2 に紐づける既存キーペア名（本人がローカルで作成し import 済みのもの）。"
  type        = string
  default     = "ansible-java-key"
}
