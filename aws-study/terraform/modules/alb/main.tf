# このリージョンで ALB ログを書き込む ELB 配信アカウント／自アカウントID（直書きしない）
data "aws_elb_service_account" "main" {}
data "aws_caller_identity" "current" {}

# ---- アクセスログ用 S3 バケット ----
resource "aws_s3_bucket" "logs" {
  bucket        = "${var.project}-alb-logs-hideharu" # 世界で一意。取られていたら変更
  force_destroy = true                               # 学習用：destroy 時にログごと削除
}

# 公開遮断（ログにアクセスさせない）
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 暗号化（ALB ログは SSE-S3/AES256 で書ける）
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ELB 配信アカウントだけが指定パスに書き込める
data "aws_iam_policy_document" "logs" {
  statement {
    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.main.arn]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.logs.arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]
  }
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  policy = data.aws_iam_policy_document.logs.json
}

# ---- ALB 本体（public 2AZ・アクセスログ有効） ----
resource "aws_lb" "this" {
  name               = "${var.project}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids # public 2枚のみ

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb"
    enabled = true
  }

  # ログのバケットポリシーが先に無いと ALB 作成が失敗するため明示依存
  depends_on = [aws_s3_bucket_policy.logs]
}

# ---- ターゲットグループ（転送先＝EC2:8080） ----
resource "aws_lb_target_group" "this" {
  name     = "${var.project}-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/posts"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group_attachment" "this" {
  target_group_arn = aws_lb_target_group.this.arn
  target_id        = var.instance_id
  port             = 8080
}

# ---- リスナー（80 で受けて TG へ転送） ----
resource "aws_lb_listener" "this" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}
