module "static_site" {
  source  = "./modules/static_site"
  count   = var.enable_serverless ? 1 : 0
  project = var.project
  suffix  = "hideharu"
}
