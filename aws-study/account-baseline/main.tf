# アカウント全体に効く「土台」の設定。EC2/RDS等のアプリ用リソース(aws-study/terraform)とは
# 別レイヤなので、意図的に別ディレクトリ・別stateに分離している。
#
# 理由: 同じツリーに置くと .github/workflows/app-deploy.yml の path フィルタ
# (aws-study/terraform/**) に触れてしまい、main マージのたびに
# EC2/ALB/Ansible のフルデプロイが誤発火する。ここは CD の対象外とし、
# apply は本人がローカルで実行する(capstone の apply ロールにも
# iam:UpdateAccountPasswordPolicy 等・accessanalyzer:* の権限を渡していないため)。

# ---- パスワードポリシー(IAMユーザーのコンソールパスワードに適用。ルートユーザーは対象外) ----
resource "aws_iam_account_password_policy" "this" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_uppercase_characters   = true
  require_numbers                = true
  require_symbols                = true
  password_reuse_prevention      = 5
  allow_users_to_change_password = true
  # 有効期限は設定しない。定期的な強制変更は現在のNIST推奨に反し、
  # かえって使い回し・末尾インクリメントなど弱いパスワードを誘発するため。
}

# ---- アカウントエイリアス(サインインURLをアカウント番号から人間が読める名前に) ----
resource "aws_iam_account_alias" "this" {
  account_alias = var.account_alias
}

# ---- IAM Access Analyzer(外部アクセス分析) ----
# type = "ACCOUNT" が無料の外部アクセス分析。"ACCOUNT_UNUSED_ACCESS"(未使用アクセス分析)は
# 分析対象ごとに課金されるため使わない。
resource "aws_accessanalyzer_analyzer" "external" {
  analyzer_name = "${var.project}-external-access"
  type          = "ACCOUNT"
}
