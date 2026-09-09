output "account_alias" {
  value = aws_iam_account_alias.this.account_alias
}

output "access_analyzer_arn" {
  value = aws_accessanalyzer_analyzer.external.arn
}
