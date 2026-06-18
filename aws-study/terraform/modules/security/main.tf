# ALB 用 SG：インターネットから HTTP 80 を受ける
resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "ALB SG (HTTP 80 from internet)"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-alb-sg" }
}

# EC2 用 SG：アプリ 8080 は ALB からのみ／SSH 22 は自分の IP からのみ
resource "aws_security_group" "ec2" {
  name        = "${var.project}-ec2-sg"
  description = "EC2 SG (8080 from ALB, 22 from my_ip)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "App 8080 from ALB only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id] # ALB SG からのみ
  }
  ingress {
    description = "SSH from my IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip] # /32 限定（全開放しない）
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-ec2-sg" }
}

# RDS 用 SG：MySQL 3306 は EC2 SG からのみ
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "RDS SG (3306 from EC2 SG)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from EC2 SG"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-rds-sg" }
}
