variable "project" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "rds_sg_id" { type = string }
variable "db_username" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}

# 採点6：multi_az / backup を変数化（既定は学習向けに控えめ）
variable "multi_az" {
  type    = bool
  default = false
}
variable "backup_retention_period" {
  type    = number
  default = 0
}
