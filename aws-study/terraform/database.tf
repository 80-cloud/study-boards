module "database" {
  source             = "./modules/database"
  count              = var.enable_rds ? 1 : 0
  project            = var.project
  private_subnet_ids = module.network.private_subnet_ids
  rds_sg_id          = module.security.rds_sg_id
  db_username        = module.secrets.db_username
  db_password        = module.secrets.db_password

  # 既定 false（最終スナップショットを残す）。破棄時に -var="skip_final_snapshot=true" で省略可。
  skip_final_snapshot = var.skip_final_snapshot
}
