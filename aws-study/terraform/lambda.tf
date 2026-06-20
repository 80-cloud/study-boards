module "lambda" {
  source        = "./modules/lambda"
  project       = var.project
  function_name = "hello"
}
