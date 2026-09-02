# §9: ALB / TargetGroup / SecurityGroup / IAM / EC2 のセキュリティを plan モードで保証（$0）。
# 実行: terraform test
# 注意: ①(ALB) ⑤(compute) は data source のため AWS 認証情報が必要。②③④はオフライン可。

# ① ターゲットグループのポートがアプリ(8080)と一致
run "target_group_port_is_8080" {
  command = plan

  module {
    source = "./modules/alb"
  }
  variables {
    project           = "aws-study"
    vpc_id            = "vpc-12345678"
    public_subnet_ids = ["subnet-aaa", "subnet-bbb"]
    alb_sg_id         = "sg-12345678"
    instance_id       = "i-1234567890abcdef0"
  }

  assert {
    condition     = aws_lb_target_group.this.port == 8080
    error_message = "ターゲットグループのポートはアプリと同じ 8080 であるべき"
  }
}

# ② ALB-SG は HTTP/HTTPS のみ（SSH(22) を開けていない）
run "alb_sg_is_http_https_only" {
  command = plan

  module {
    source = "./modules/security"
  }
  variables {
    project = "aws-study"
    vpc_id  = "vpc-12345678"
  }

  assert {
    condition = alltrue([
      for r in aws_security_group.alb.ingress : contains([80, 443], r.from_port)
    ])
    error_message = "ALB-SG の ingress は 80/443 のみ（SSH 等を開けない）であるべき"
  }
}

# ③ EC2-SG は SSH(22) の ingress を一切持たない（SSM 採用＝22 完全閉鎖）
run "ec2_sg_has_no_ssh_ingress" {
  command = plan

  module {
    source = "./modules/security"
  }
  variables {
    project = "aws-study"
    vpc_id  = "vpc-12345678"
  }

  assert {
    condition = alltrue([
      for r in aws_security_group.ec2.ingress : r.from_port != 22
    ])
    error_message = "SSM 採用のため EC2-SG に 22(SSH) の ingress を作らない"
  }
}

# ④ EC2 ロールに SSM 接続用マネージドポリシーが付く（SSM 必須3点①）
run "ec2_role_has_ssm_core_policy" {
  command = plan

  module {
    source = "./modules/iam"
  }
  variables {
    project    = "aws-study"
    secret_arn = "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:dummy"
  }

  assert {
    condition     = aws_iam_role_policy_attachment.ssm.policy_arn == "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    error_message = "EC2 ロールに AmazonSSMManagedInstanceCore が付くべき（SSM 接続の前提）"
  }
}

# ⑤ EC2 にインスタンスプロファイルが装着されている（SSM 必須3点①の実体）
run "ec2_has_instance_profile" {
  command = plan

  module {
    source = "./modules/compute"
  }
  variables {
    project               = "aws-study"
    region                = "ap-northeast-1"
    public_subnet_id      = "subnet-aaa"
    ec2_sg_id             = "sg-12345678"
    instance_profile_name = "aws-study-ec2-profile"
    secret_id             = "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:dummy"
  }

  assert {
    condition     = aws_instance.this.iam_instance_profile != null
    error_message = "EC2 にインスタンスプロファイルが装着されているべき"
  }
}

