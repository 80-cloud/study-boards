module "apigw" {
  source               = "./modules/apigw"
  count                = var.enable_serverless ? 1 : 0
  project              = var.project
  lambda_invoke_arn    = module.lambda[0].invoke_arn
  lambda_function_name = module.lambda[0].function_name
}
