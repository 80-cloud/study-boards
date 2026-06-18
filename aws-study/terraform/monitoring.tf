module "monitoring" {
  source      = "./modules/monitoring"
  project     = var.project
  region      = var.region
  instance_id = module.compute.instance_id
  # alarm_email = "you@example.com"  # メール通知が要るとき指定
}
