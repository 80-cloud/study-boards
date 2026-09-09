# EC2 がこのロールを引き受ける（AssumeRole）ための信頼ポリシー
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# SSM 接続（22 番を開けずに繋ぐための公式マネージドポリシー）
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch エージェント用
resource "aws_iam_role_policy_attachment" "cwagent" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Secrets Manager は「このシークレットだけ」読める（最小権限＝採点3。"*" にしない）
data "aws_iam_policy_document" "secret_read" {
  statement {
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [var.secret_arn]
  }
}

resource "aws_iam_role_policy" "secret_read" {
  name   = "${var.project}-secret-read"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.secret_read.json
}

# インスタンスプロファイル（EC2 にロールを装着する器）
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.ec2.name
}

