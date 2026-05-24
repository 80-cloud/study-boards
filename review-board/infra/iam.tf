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

  # CD アーティファクトの取得（読み取り専用）。deploy.sh が <sha>/ を sync する。
  statement {
    sid    = "ArtifactsBucketRead"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.artifacts.arn,
      "${aws_s3_bucket.artifacts.arn}/*",
    ]
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

# SSM Session Manager / Run Command 用。cd-deploy が SSM Run Command で deploy.sh を実行するため、
# EC2 が SSM Systems Manager に登録される必要がある（ssmmessages/ec2messages/UpdateInstanceInformation）。
# AWS 管理ポリシーを追加付与（最小スコープの管理ポリシー）。
resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# =====================================================================
# CD 用 CI ユーザー（GitHub Actions 専用・最小権限・#198）
# =====================================================================
# cd-build: artifacts バケットへアーティファクト push。
# cd-deploy: ec2:DescribeInstances でインスタンス解決 → ssm:SendCommand で deploy.sh 実行。
# 既存の github-actions-rds-stop（rds-auto-stop / terraform-plan が共有）とは分離し、
# 関心と権限を CD に限定する。鍵は別シークレット RB_CD_AWS_* に設定する。
resource "aws_iam_user" "github_actions_cd" {
  name = "${local.name_prefix}-github-actions-cd"
  tags = { Name = "${local.name_prefix}-github-actions-cd" }
}

data "aws_iam_policy_document" "cd_permissions" {
  # cd-build: artifacts への push（sync = Put/Get/List）。
  statement {
    sid       = "ArtifactsBucketWrite"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
  }

  # cd-deploy: タグでインスタンスを解決（describe は resource-level 非対応＝*）。
  statement {
    sid       = "DescribeInstances"
    effect    = "Allow"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"] #tfsec:ignore:aws-iam-no-policy-wildcards DescribeInstances は resource-level 非対応
  }

  # cd-deploy: RunShellScript を Project タグ付きインスタンスにのみ送信。
  statement {
    sid     = "SendCommandToTaggedInstance"
    effect  = "Allow"
    actions = ["ssm:SendCommand"]
    resources = [
      "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript",
      "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/*",
    ]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Project"
      values   = ["review-board"]
    }
  }

  # cd-deploy: コマンド実行結果のポーリング（read-only・command id は動的）。
  statement {
    sid       = "ReadCommandInvocation"
    effect    = "Allow"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"] #tfsec:ignore:aws-iam-no-policy-wildcards command invocation の ARN は動的・read-only
  }
}

resource "aws_iam_user_policy" "github_actions_cd" {
  name   = "${local.name_prefix}-cd-policy"
  user   = aws_iam_user.github_actions_cd.name
  policy = data.aws_iam_policy_document.cd_permissions.json
}

# アクセスキー（GitHub Secret に設定するため output で取得）。
# tfstate に平文保存される点に留意（terraform.tfstate は gitignore・ローカル限定）。
#tfsec:ignore:aws-iam-no-user-attached-policies
resource "aws_iam_access_key" "github_actions_cd" {
  user = aws_iam_user.github_actions_cd.name
}
