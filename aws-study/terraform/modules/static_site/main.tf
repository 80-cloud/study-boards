resource "aws_s3_bucket" "this" {
  bucket = "${var.project}-site-${var.suffix}"
}
resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.this.id
  key          = "index.html"
  content      = "<h1>Hello from S3 + CloudFront</h1>"
  content_type = "text/html"
}
