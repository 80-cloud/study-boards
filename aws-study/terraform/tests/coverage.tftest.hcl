# 追加カバレッジ（plan モード・$0）。serverless.tftest.hcl と一緒に走ります。

# Lambda：ハンドラ指定とログ保持
run "lambda_handler_and_logs" {
  command = plan
  module { source = "./modules/lambda" }
  variables {
    project       = "aws-study"
    function_name = "hello"
  }
  assert {
    condition     = aws_lambda_function.this.handler == "handler.handler"
    error_message = "handler は handler.handler であるべき"
  }
  assert {
    condition     = aws_cloudwatch_log_group.this.retention_in_days == 7
    error_message = "ロググループの保持は7日であるべき"
  }
}

# API Gateway：HTTP API / AWS_PROXY / payload 2.0 / ルート
run "apigw_config" {
  command = plan
  module { source = "./modules/apigw" }
  variables {
    project              = "aws-study"
    lambda_invoke_arn    = "arn:aws:lambda:ap-northeast-1:123456789012:function:dummy/invocations"
    lambda_function_name = "dummy"
  }
  assert {
    condition     = aws_apigatewayv2_api.this.protocol_type == "HTTP"
    error_message = "HTTP API であるべき"
  }
  assert {
    condition     = aws_apigatewayv2_integration.lambda.integration_type == "AWS_PROXY"
    error_message = "統合は AWS_PROXY であるべき"
  }
  assert {
    condition     = aws_apigatewayv2_integration.lambda.payload_format_version == "2.0"
    error_message = "payload_format_version は 2.0 であるべき"
  }
  assert {
    condition     = aws_apigatewayv2_route.hello.route_key == "GET /api/hello"
    error_message = "ルートは GET /api/hello であるべき"
  }
}

# 静的サイト：index.html を text/html で配置
run "static_site_object" {
  command = plan
  module { source = "./modules/static_site" }
  variables {
    project = "aws-study"
    suffix  = "test"
  }
  assert {
    condition     = aws_s3_object.index.key == "index.html"
    error_message = "オブジェクトキーは index.html であるべき"
  }
  assert {
    condition     = aws_s3_object.index.content_type == "text/html"
    error_message = "content_type は text/html であるべき"
  }
}

# CloudFront：既定ルートオブジェクトと OAC
run "cdn_config" {
  command = plan
  module { source = "./modules/cdn" }
  variables {
    project        = "aws-study"
    s3_domain_name = "dummy.s3.ap-northeast-1.amazonaws.com"
    s3_bucket_id   = "dummy"
    s3_bucket_arn  = "arn:aws:s3:::dummy"
    api_host       = "dummy.execute-api.ap-northeast-1.amazonaws.com"
  }
  assert {
    condition     = aws_cloudfront_distribution.this.default_root_object == "index.html"
    error_message = "default_root_object は index.html であるべき"
  }
  assert {
    condition     = aws_cloudfront_origin_access_control.s3.signing_behavior == "always"
    error_message = "OAC の signing_behavior は always であるべき"
  }
}

# my_ip：正しい形式(x.x.x.x/32)なら通る（③の逆＝ポジティブ）
run "accepts_valid_my_ip" {
  command = plan
  variables {
    my_ip             = "203.0.113.10/32"
    enable_serverless = true
  }
  assert {
    condition     = output.lambda_function_name == "aws-study-hello"
    error_message = "正しい my_ip ならプランが通り、出力が得られるはず"
  }
}
