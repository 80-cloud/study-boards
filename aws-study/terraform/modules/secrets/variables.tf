variable "project" { type = string }
variable "db_username" {
  type    = string
  default = "admin" # root のような特権名は避ける
}
