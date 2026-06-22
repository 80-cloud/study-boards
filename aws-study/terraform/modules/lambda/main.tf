# Lambda 一式：zip化 → 実行ロール → ロググループ → 関数
data "archive_file" "this" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/${var.function_name}.zip"
}
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "this" {
  name               = "${var.project}-${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}
resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.project}-${var.function_name}"
  retention_in_days = 7
}
resource "aws_lambda_function" "this" {
  function_name    = "${var.project}-${var.function_name}"
  role             = aws_iam_role.this.arn
  runtime          = "nodejs22.x"
  handler          = "handler.handler"
  filename         = data.archive_file.this.output_path
  source_code_hash = data.archive_file.this.output_base64sha256
  depends_on       = [aws_cloudwatch_log_group.this]
}
