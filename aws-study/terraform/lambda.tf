module "lambda" {
  source        = "./modules/lambda"
  count         = var.enable_serverless ? 1 : 0
  project       = var.project
  function_name = "hello"
}
