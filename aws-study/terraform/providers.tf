# AWS プロバイダ。リージョンはコードに直書きせず変数で受け取る（DRY・環境差を吸収）。
provider "aws" {
  region = var.region
}
