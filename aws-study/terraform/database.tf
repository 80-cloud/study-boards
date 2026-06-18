module "database" {
  source             = "./modules/database"
  project            = var.project
  private_subnet_ids = module.network.private_subnet_ids
  rds_sg_id          = module.security.rds_sg_id
  db_username        = module.secrets.db_username
  db_password        = module.secrets.db_password
}
