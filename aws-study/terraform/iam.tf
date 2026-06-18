module "iam" {
  source     = "./modules/iam"
  project    = var.project
  secret_arn = module.secrets.secret_arn # 最小権限の限定先を渡す
}
