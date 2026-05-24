# =====================================================================
# artifacts.tf — CD の不変アーティファクト配布バケット（#161 / S-2）
# =====================================================================
# cd-build が <sha>/app.jar と <sha>/dist を push し、EC2 の deploy.sh が
# IAM ロールで取得する。非公開・暗号化・versioning・非SSL拒否（screenshots と同方針）。
# =====================================================================

#tfsec:ignore:aws-s3-enable-bucket-logging アクセスログ用バケットは本格運用フェーズで追加
resource "aws_s3_bucket" "artifacts" {
  bucket = "${local.name_prefix}-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "${local.name_prefix}-artifacts" }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

#tfsec:ignore:aws-s3-encryption-customer-key 学習スコープは SSE-S3（無料）。CMK は本格運用フェーズ
resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

# 古い版・サイズ管理（無料枠 5GB 内）。アーティファクトは SHA 単位で増えるため期限切れを設定。
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"

    filter {}

    # 現行版は 90 日、旧版は 30 日で失効（ロールバック余地を残しつつ肥大化を防ぐ）。
    expiration {
      days = 90
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# 非 SSL アクセス拒否（転送時暗号化の強制）。
data "aws_iam_policy_document" "artifacts" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket     = aws_s3_bucket.artifacts.id
  policy     = data.aws_iam_policy_document.artifacts.json
  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}
