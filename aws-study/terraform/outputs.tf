# 出力（Outputs）。リソースを追加する各フェーズで、属性まで明示して追記する。
# 例: output "vpc_id" { value = module.network.vpc_id }
#     値はリソース名だけでなく .id / .arn / .endpoint など属性まで書く。

output "alb_dns" {
  value = module.alb.alb_dns_name
}
