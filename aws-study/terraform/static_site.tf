module "static_site" {
  source  = "./modules/static_site"
  project = var.project
  suffix  = "hideharu"
}
