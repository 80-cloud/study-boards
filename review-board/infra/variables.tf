# =====================================================================
# variables.tf — 変数宣言
# =====================================================================
# 値の実体は terraform.tfvars（.gitignore・Git 管理外）に書く。
# default の無い変数（my_ip_cidr / db_password / jwt_secret / budget_notify_email）は
# tfvars に書かないと apply できない＝事故の入口を絞る。
# =====================================================================

variable "aws_region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "リソース名プレフィックス"
  type        = string
  default     = "review-board"
}

variable "environment" {
  description = "環境識別子（dev/stg/prod）"
  type        = string
  default     = "prod"
}

# --- ネットワーク ---

variable "vpc_cidr" {
  description = "VPC の CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "パブリックサブネット（EC2）の CIDR"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_a_cidr" {
  description = "プライベートサブネット A（RDS）の CIDR"
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_subnet_b_cidr" {
  description = "プライベートサブネット B（RDS Subnet Group は2AZ必須）の CIDR"
  type        = string
  default     = "10.0.3.0/24"
}

variable "availability_zone_a" {
  description = "AZ-A（public + private-a）"
  type        = string
  default     = "ap-northeast-1a"
}

variable "availability_zone_b" {
  description = "AZ-B（private-b）"
  type        = string
  default     = "ap-northeast-1c"
}

variable "my_ip_cidr" {
  description = "SSH(22) を許可する自宅 IP の /32。0.0.0.0/0 は禁止。"
  type        = string
  # default 無し：tfvars で必ず明示

  validation {
    condition     = var.my_ip_cidr != "0.0.0.0/0" && can(cidrhost(var.my_ip_cidr, 0))
    error_message = "my_ip_cidr は有効な CIDR で、0.0.0.0/0 以外を指定してください（SSH 全世界開放の禁止）。"
  }
}

# --- EC2 ---

variable "instance_type" {
  description = "EC2 タイプ（ap-northeast-1 の無料枠は t3.micro）"
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key_path" {
  description = "AWS Key Pair に登録する SSH 公開鍵のローカルパス"
  type        = string
  default     = "~/.ssh/aws-review-board.pub"
}

# --- RDS ---

variable "db_engine_version" {
  description = "PostgreSQL バージョン（ローカル/Flyway と整合）"
  type        = string
  default     = "16.10"
}

variable "db_instance_class" {
  description = "RDS タイプ（無料枠は db.t3.micro）"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS ストレージ(GB)（無料枠 20GB まで）"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "初期データベース名"
  type        = string
  default     = "reviewboard"
}

variable "db_username" {
  description = "RDS マスターユーザー名"
  type        = string
  default     = "reviewboard"
}

variable "db_password" {
  description = "RDS マスターパスワード（tfvars・最低12文字）"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 12
    error_message = "db_password は12文字以上で指定してください。"
  }
}

# --- アプリ機密（SSM Parameter Store 経由で EC2 に注入） ---

variable "jwt_secret" {
  description = "JWT 署名鍵（HS256・32文字以上＝256bit 以上必須・SEC-7）。SSM SecureString に格納。"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "jwt_secret は32文字以上（256bit 以上）で指定してください。"
  }
}

# --- コスト防御 ---

variable "monthly_budget_usd" {
  description = "AWS Budgets の月次しきい値(USD)。超過で通知。"
  type        = number
  default     = 0.5
}

variable "budget_notify_email" {
  description = "Budgets 通知先メールアドレス"
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.budget_notify_email))
    error_message = "budget_notify_email は有効なメールアドレスを指定してください。"
  }
}

# 初代管理者の bootstrap（任意）。password を空にすると管理者を作成しない
# （後から管理 API/手動で発行）。設定する場合は tfvars で機密扱い。
variable "bootstrap_admin_email" {
  description = "初代管理者のメールアドレス（bootstrap_admin_password 設定時のみ有効）"
  type        = string
  default     = "admin@example.com"
}

variable "bootstrap_admin_password" {
  description = "初代管理者の初期パスワード（空なら管理者を作成しない）"
  type        = string
  default     = ""
  sensitive   = true
}
