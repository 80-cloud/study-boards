module "security" {
  source  = "./modules/security"
  project = var.project
  vpc_id  = module.network.vpc_id
  my_ip   = var.my_ip
}
