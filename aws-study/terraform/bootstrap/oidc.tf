# GitHub Actions -> AWS を OIDC（短期トークン）で認証する踏み台。
# 長期アクセスキーを Secrets に置かないための要。state バケットと同じくローカル state で
# 一度だけ apply し常設（CD が動く前に存在している必要がある）。

data "aws_caller_identity" "current" {}

locals {
  account_id       = data.aws_caller_identity.current.account_id
  repo             = "80-cloud/study-boards"
  sub_pull_request = "repo:${local.repo}:pull_request"
  sub_main         = "repo:${local.repo}:ref:refs/heads/main"
  sub_env_prod     = "repo:${local.repo}:environment:prod" # environment 指定で sub はこれに変わる
}

# ---- GitHub Actions 用 OIDC プロバイダ（アカウントに1つ） ----
# thumbprint_list は省略可（AWS が自動取得・管理）。
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# ============== (A) plan ロール：PR(CI)・main(CD) から assume・読取のみ ==============
data "aws_iam_policy_document" "plan_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.sub_pull_request, local.sub_main]
    }
  }
}

resource "aws_iam_role" "plan" {
  name               = "aws-study-tf-plan"
  assume_role_policy = data.aws_iam_policy_document.plan_trust.json
}

# 読取は AWS 管理の ReadOnlyAccess（変更系を含まない＝壊せない）
resource "aws_iam_role_policy_attachment" "plan_readonly" {
  role       = aws_iam_role.plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# plan でも use_lockfile のロック(.tflock)を state バケットに置くため state だけ書込可
resource "aws_iam_role_policy" "plan_state" {
  name   = "tf-state-access"
  role   = aws_iam_role.plan.id
  policy = data.aws_iam_policy_document.state_access.json
}

# ============== (B) apply ロール：environment:prod（承認済み実行）からのみ・変更可 ==============
data "aws_iam_policy_document" "apply_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition { # 承認ゲートを通った prod 環境ジョブだけ
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.sub_env_prod]
    }
  }
}

resource "aws_iam_role" "apply" {
  name               = "aws-study-tf-apply"
  assume_role_policy = data.aws_iam_policy_document.apply_trust.json
}

resource "aws_iam_role_policy" "apply_state" {
  name   = "tf-state-access"
  role   = aws_iam_role.apply.id
  policy = data.aws_iam_policy_document.state_access.json
}

resource "aws_iam_role_policy" "apply_infra" {
  name   = "tf-infra-manage"
  role   = aws_iam_role.apply.id
  policy = data.aws_iam_policy_document.apply_infra.json
}

# ============== 共通：state バケットアクセス（plan/apply 両方） ==============
data "aws_iam_policy_document" "state_access" {
  statement {
    sid       = "ListStateBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.state_bucket_name}"]
  }
  statement {
    sid       = "ReadWriteState"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"] # .tflock も含む
    resources = ["arn:aws:s3:::${var.state_bucket_name}/*"]
  }
}

# ============== apply の変更権限（iam は aws-study-* 限定・他は動詞ファミリ＋東京限定） ==============
data "aws_iam_policy_document" "apply_infra" {
  # provider 初期化で呼ばれる（modules/alb も data.aws_caller_identity を使用）
  statement {
    sid       = "StsIdentity"
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }

  statement {
    sid    = "IamScopedToProject"
    effect = "Allow"
    actions = [
      "iam:GetRole", "iam:CreateRole", "iam:DeleteRole", "iam:TagRole", "iam:UntagRole",
      "iam:GetRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:ListRolePolicies",
      "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies",
      "iam:CreateInstanceProfile", "iam:DeleteInstanceProfile", "iam:GetInstanceProfile",
      "iam:AddRoleToInstanceProfile", "iam:RemoveRoleFromInstanceProfile",
      "iam:ListInstanceProfilesForRole", "iam:PassRole",
    ]
    resources = [
      "arn:aws:iam::${local.account_id}:role/aws-study-*",
      "arn:aws:iam::${local.account_id}:instance-profile/aws-study-*",
    ]
  }

  statement {
    sid    = "S3SiteManage"
    effect = "Allow"
    # provider はバケット作成時に accelerate/lifecycle 等のサブ設定を読むため、
    # リソースを aws-study-* に限定したうえで Get/Put/List を広めに許可する。
    actions = [
      "s3:CreateBucket", "s3:DeleteBucket", "s3:DeleteObject",
      "s3:Get*", "s3:Put*", "s3:List*",
    ]
    resources = ["arn:aws:s3:::aws-study-*", "arn:aws:s3:::aws-study-*/*"]
  }

  statement {
    sid       = "CloudFront" # グローバル
    effect    = "Allow"
    actions   = ["cloudfront:*Distribution*", "cloudfront:*OriginAccessControl*", "cloudfront:Get*", "cloudfront:List*", "cloudfront:TagResource", "cloudfront:UntagResource"]
    resources = ["*"]
  }

  statement {
    sid    = "RegionalInfra"
    effect = "Allow"
    actions = [
      "ec2:Describe*", "ec2:Create*", "ec2:Delete*", "ec2:Modify*", "ec2:Associate*",
      "ec2:Disassociate*", "ec2:Attach*", "ec2:Detach*", "ec2:Authorize*", "ec2:Revoke*",
      "ec2:RunInstances", "ec2:TerminateInstances", "ec2:Start*", "ec2:Stop*",
      "ec2:AllocateAddress", "ec2:ReleaseAddress",
      "elasticloadbalancing:*",
      "rds:Describe*", "rds:Create*", "rds:Delete*", "rds:Modify*", "rds:AddTagsToResource", "rds:RemoveTagsFromResource", "rds:ListTagsForResource",
      "cloudwatch:Describe*", "cloudwatch:Get*", "cloudwatch:List*", "cloudwatch:PutMetricAlarm", "cloudwatch:DeleteAlarms", "cloudwatch:TagResource", "cloudwatch:UntagResource",
      "logs:Describe*", "logs:Get*", "logs:List*", "logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:PutRetentionPolicy", "logs:TagResource", "logs:UntagResource",
      "sns:Get*", "sns:List*", "sns:CreateTopic", "sns:DeleteTopic", "sns:Subscribe", "sns:Unsubscribe", "sns:SetTopicAttributes", "sns:TagResource", "sns:UntagResource",
      "secretsmanager:Describe*", "secretsmanager:Get*", "secretsmanager:List*", "secretsmanager:CreateSecret", "secretsmanager:DeleteSecret", "secretsmanager:PutSecretValue", "secretsmanager:UpdateSecret", "secretsmanager:TagResource", "secretsmanager:UntagResource",
      "lambda:*",
      "apigateway:*",
      "wafv2:*",
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.region]
    }
  }
}

# ---- state バケットをアカウント内＋TLS のみに限定（PAB と二重防御・追補①） ----
data "aws_iam_policy_document" "state_bucket" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
  statement {
    sid    = "DenyOtherAccounts"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
    condition {
      test     = "StringNotEquals"
      variable = "aws:PrincipalAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = data.aws_iam_policy_document.state_bucket.json
}
