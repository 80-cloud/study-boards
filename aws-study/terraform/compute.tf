module "compute" {
  source                = "./modules/compute"
  project               = var.project
  region                = var.region
  public_subnet_id      = module.network.public_subnet_ids[0] # 1AZ目のpublicに配置
  ec2_sg_id             = module.security.ec2_sg_id
  instance_profile_name = module.iam.instance_profile_name
  secret_id             = module.secrets.secret_arn
}
