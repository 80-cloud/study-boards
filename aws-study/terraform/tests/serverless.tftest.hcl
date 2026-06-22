# Terraform ネイティブテスト（plan モード＝実リソースを作らない・$0）
# 実行: terraform test

# ① Lambda のランタイムが現行(nodejs22.x)であること（EOL回帰テスト）
run "lambda_uses_supported_runtime" {
  command = plan

  module {
    source = "./modules/lambda"
  }
  variables {
    project       = "aws-study"
    function_name = "hello"
  }

  assert {
    condition     = aws_lambda_function.this.runtime == "nodejs22.x"
    error_message = "Lambda runtime は nodejs22.x であるべき（20.x は EOL）"
  }
}

# ② 静的サイトS3 が「公開を全ブロック」していること（最小権限）
run "s3_blocks_all_public_access" {
  command = plan

  module {
    source = "./modules/static_site"
  }
  variables {
    project = "aws-study"
    suffix  = "test"
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.this.block_public_acls &&
      aws_s3_bucket_public_access_block.this.block_public_policy &&
      aws_s3_bucket_public_access_block.this.ignore_public_acls &&
      aws_s3_bucket_public_access_block.this.restrict_public_buckets
    )
    error_message = "S3 バケットは公開を全ブロックすべき"
  }
}

# ③ my_ip に全開放(0.0.0.0/0)を入れたら validation で弾かれること
run "rejects_wide_open_my_ip" {
  command = plan

  variables {
    my_ip = "0.0.0.0/0"
  }

  expect_failures = [
    var.my_ip,
  ]
}