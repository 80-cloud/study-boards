variable "project" { type = string }
variable "secret_arn" {
  type        = string
  description = "読み取りを許可する Secrets Manager のARN（限定用）"
}
