# =====================================================================
# iam.tf — EC2 インスタンスロール（最小権限）
# =====================================================================
# EC2 上のアプリは「このバケットの読み書き」と「自分の SSM パラメータの復号読み取り」のみ可。
# 静的アクセスキーを EC2 に置かない（インスタンスロールで都度発行＝SEC-9 の延長）。
# =====================================================================

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${local.name_prefix}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json

  tags = { Name = "${local.name_prefix}-ec2-role" }
}

# 最小権限ポリシー：スクショバケットの操作 ＋ 自プロジェクトの SSM 読取＋復号
data "aws_iam_policy_document" "ec2_permissions" {
  statement {
    sid    = "ScreenshotBucketObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    # オブジェクト操作は対象を「この単一バケット配下のオブジェクト」に限定する必要があり、
    # /* は不可避（クロスリソースのワイルドカードではない）。バケット自体は最小限のまま。
    #tfsec:ignore:aws-iam-no-policy-wildcards
    resources = ["${aws_s3_bucket.screenshots.arn}/*"]
  }

  statement {
    sid       = "ScreenshotBucketList"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.screenshots.arn]
  }

  statement {
    sid    = "ReadOwnSsmParameters"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = ["arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/*"]
  }

  # SecureString 復号（aws/ssm 既定キー）。SSM 経由の復号に限定。
  statement {
    sid       = "DecryptSsmSecureString"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"] #tfsec:ignore:aws-iam-no-policy-wildcards aws/ssm 既定キーの ARN は固定できないため ViaService 条件で限定
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.aws_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "ec2" {
  name   = "${local.name_prefix}-ec2-policy"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_permissions.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = { Name = "${local.name_prefix}-ec2-profile" }
}
