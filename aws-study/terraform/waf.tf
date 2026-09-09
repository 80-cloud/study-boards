module "waf" {
  source  = "./modules/waf"
  count   = var.enable_serverless ? 1 : 0
  project = var.project
  alb_arn = module.alb.alb_arn
}
