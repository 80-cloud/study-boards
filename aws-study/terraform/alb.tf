module "alb" {
  source            = "./modules/alb"
  project           = var.project
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  alb_sg_id         = module.security.alb_sg_id
  instance_id       = module.compute.instance_id
}
