# §9: ALB / TargetGroup / SecurityGroup のセキュリティをテストで保証（plan モード＝$0）。
# 実行: terraform test
# 注意: ① の ALB テストは modules/alb の data(aws_elb_service_account / aws_caller_identity)
#       のため AWS 認証情報が必要。②③ の security モジュールは data 無しで完全オフライン。

# ① ターゲットグループのポートがアプリ(8080)と一致
run "target_group_port_is_8080" {
  command = plan

  module {
    source = "./modules/alb"
  }
  variables {
    project           = "aws-study"
    vpc_id            = "vpc-12345678" # plan 用ダミー（実在不要）
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
    my_ip   = "203.0.113.10/32"
  }

  assert {
    condition = alltrue([
      for r in aws_security_group.alb.ingress : contains([80, 443], r.from_port)
    ])
    error_message = "ALB-SG の ingress は 80/443 のみ（SSH 等を開けない）であるべき"
  }
}

# ③ EC2-SG の SSH(22) は my_ip(/32) のみ・0.0.0.0/0 で開けない
run "ec2_sg_ssh_is_my_ip_only" {
  command = plan

  module {
    source = "./modules/security"
  }
  variables {
    project = "aws-study"
    vpc_id  = "vpc-12345678"
    my_ip   = "203.0.113.10/32"
  }

  # 22 番に 0.0.0.0/0 が無いこと
  assert {
    condition = alltrue([
      for r in aws_security_group.ec2.ingress :
      r.from_port != 22 || !contains(coalesce(r.cidr_blocks, []), "0.0.0.0/0")
    ])
    error_message = "EC2-SG の SSH(22) を 0.0.0.0/0 に開けてはいけない"
  }

  # 22 番が my_ip(/32) から許可されていること
  assert {
    condition = anytrue([
      for r in aws_security_group.ec2.ingress :
      r.from_port == 22 && contains(coalesce(r.cidr_blocks, []), var.my_ip)
    ])
    error_message = "EC2-SG の SSH(22) は my_ip(/32) のみから許可されているべき"
  }
}
