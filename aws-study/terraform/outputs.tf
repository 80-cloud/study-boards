# 出力（Outputs）。リソースを追加する各フェーズで、属性まで明示して追記する。
# 例: output "vpc_id" { value = module.network.vpc_id }
#     値はリソース名だけでなく .id / .arn / .endpoint など属性まで書く。

output "alb_dns" {
  value = module.alb.alb_dns_name
}

output "lambda_function_name" {
  value = module.lambda.function_name
}

output "api_url" {
  value = module.apigw.api_url
}

output "cloudfront_url" {
  value = "https://${module.cdn.domain_name}"
}