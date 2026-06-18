variable "project" { type = string }
variable "region" { type = string }
variable "public_subnet_id" { type = string }
variable "ec2_sg_id" { type = string }
variable "instance_profile_name" { type = string }
variable "secret_id" {
  type        = string
  description = "起動時に読む Secrets Manager のARN/名前"
}
