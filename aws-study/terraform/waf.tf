module "waf" {
  source  = "./modules/waf"
  project = var.project
  alb_arn = module.alb.alb_arn
}
