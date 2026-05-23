# =====================================================================
# s3.tf — 成果物スクショ用バケット（MinIO の本番置換・SEC-8 / P-10）
# =====================================================================
# 非公開（public access block 全 true）。アップロードは API 経由で magic byte 検証、
# 配信は署名付き URL のみ。バケットポリシーで非 SSL アクセスを拒否。
# =====================================================================

data "aws_caller_identity" "current" {}

# バケット名はグローバル一意が必要。アカウント ID を後置して衝突を避ける。
# 理由: アクセスログ用の別バケットは学習スコープでは未設定（ログ用バケットの追加コスト回避）。
#       本格運用フェーズで access logging を有効化する。
#tfsec:ignore:aws-s3-enable-bucket-logging
resource "aws_s3_bucket" "screenshots" {
  bucket = "${local.name_prefix}-screenshots-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "${local.name_prefix}-screenshots" }
}

# 公開を全面ブロック（誰でも read できる状態を作らない＝SEC-8 隔離）
resource "aws_s3_bucket_public_access_block" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 保管時暗号化（SSE-S3）
# 理由: 学習スコープでは SSE-S3(AES256) で十分（無料）。顧客管理 KMS キー(CMK)は
#       追加コストが生じるため本格運用フェーズで導入する。
#tfsec:ignore:aws-s3-encryption-customer-key
resource "aws_s3_bucket_server_side_encryption_configuration" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 誤上書き・誤削除からの復旧余地
resource "aws_s3_bucket_versioning" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  versioning_configuration {
    status = "Enabled"
  }
}

# 古い版・サイズ管理（無料枠 5GB 内に収める）
resource "aws_s3_bucket_lifecycle_configuration" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# 非 SSL（HTTP）アクセスを拒否する明示ポリシー（転送時暗号化の強制）
data "aws_iam_policy_document" "screenshots" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.screenshots.arn, "${aws_s3_bucket.screenshots.arn}/*"]

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

resource "aws_s3_bucket_policy" "screenshots" {
  bucket = aws_s3_bucket.screenshots.id
  policy = data.aws_iam_policy_document.screenshots.json

  # public access block と競合しない（Deny のみ）
  depends_on = [aws_s3_bucket_public_access_block.screenshots]
}
