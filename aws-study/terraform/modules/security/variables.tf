variable "project" { type = string }
variable "vpc_id" { type = string }
variable "my_ip" {
  type        = string
  description = "SSH 許可元 IP（/32）"
}
