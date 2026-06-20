module "cdn" {
  source         = "./modules/cdn"
  project        = var.project
  s3_domain_name = module.static_site.bucket_regional_domain_name
  s3_bucket_id   = module.static_site.bucket_id
  s3_bucket_arn  = module.static_site.bucket_arn
  api_host       = module.apigw.api_host
}
