variable "project" { type = string }
variable "alb_arn" {
  type        = string
  description = "保護対象の ALB の ARN"
}
