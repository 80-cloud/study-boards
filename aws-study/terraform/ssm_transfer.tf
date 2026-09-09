# Ansible(amazon.aws.aws_ssm) がモジュールファイルを EC2 へ受け渡すための中継 S3 バケット。
# runner が presigned URL を作り SSM 経由で渡す（EC2 側に S3 権限は不要）。
# 名前は aws-study-* スコープ内（apply ロールの S3 権限が及ぶ）。
resource "aws_s3_bucket" "ssm_transfer" {
  bucket        = "${var.project}-ssm-transfer-hideharu" # 世界で一意。取られていたら変更
  force_destroy = true                                   # 学習用：破棄時に中継ファイルごと削除
}

# 公開遮断
resource "aws_s3_bucket_public_access_block" "ssm_transfer" {
  bucket                  = aws_s3_bucket.ssm_transfer.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 暗号化（SSE-S3/AES256）。Ansible 側 ansible_aws_ssm_bucket_sse_mode=AES256 と合わせる。
resource "aws_s3_bucket_server_side_encryption_configuration" "ssm_transfer" {
  bucket = aws_s3_bucket.ssm_transfer.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
