output "alb_dns_name" {
  value = aws_lb.this.dns_name
}
output "alb_arn" {
  value = aws_lb.this.arn # フェーズ9のWAF紐付けで使う
}
output "logs_bucket" {
  value = aws_s3_bucket.logs.id
}
