output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id # 全 public サブネットの id をリストで
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
