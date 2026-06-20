module "apigw" {
  source               = "./modules/apigw"
  project              = var.project
  lambda_invoke_arn    = module.lambda.invoke_arn
  lambda_function_name = module.lambda.function_name
}
