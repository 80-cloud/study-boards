module "cdn" {
  source         = "./modules/cdn"
  count          = var.enable_serverless ? 1 : 0
  project        = var.project
  s3_domain_name = module.static_site[0].bucket_regional_domain_name
  s3_bucket_id   = module.static_site[0].bucket_id
  s3_bucket_arn  = module.static_site[0].bucket_arn
  api_host       = module.apigw[0].api_host
}
