output "state_bucket" {
  value = aws_s3_bucket.state.id
}

output "tf_plan_role_arn" {
  value = aws_iam_role.plan.arn
}

output "tf_apply_role_arn" {
  value = aws_iam_role.apply.arn
}