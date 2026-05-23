#!/bin/bash
# =====================================================================
# user_data.sh — EC2 初回起動の cloud-init（ランタイム基盤のみ）
# =====================================================================
# root 権限で1回だけ実行。ログは /var/log/cloud-init-output.log。
# ここでやるのは「土台」まで：nginx・Java 25・swap・SSM Agent。
# アプリ本体(jar/React build)の配置・nginx の vhost・TLS 証明書(certbot)は
# Terraform 管理外（インフラ構成.md §7）＝別のデプロイ手順で行う。
# =====================================================================
set -euxo pipefail
exec > >(tee -a /var/log/cloud-init-output.log) 2>&1
echo "===== user_data started: $(date -Iseconds) ====="

# ---------------------------------------------------------------------
# swap 4GB：t3.micro は RAM 1GB のため、ビルド/起動時の OOM を防ぐ
# ---------------------------------------------------------------------
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# ---------------------------------------------------------------------
# パッケージ：Java 25（Corretto）・nginx・git・certbot
# ---------------------------------------------------------------------
dnf update -y
dnf install -y java-25-amazon-corretto-headless nginx git

# SSM Agent（AL2023 は既定で導入済みのことが多いが明示）
dnf install -y amazon-ssm-agent || true
systemctl enable --now amazon-ssm-agent || true

# nginx は起動だけしておく（vhost/TLS は後段のデプロイ手順で設定）
systemctl enable --now nginx

echo "===== user_data finished: $(date -Iseconds) ====="
# 次の手順（Terraform 管理外）：
#   1) backend jar と React build を配置
#   2) SSM から JWT_SECRET / DATABASE_PASSWORD / DATABASE_URL を取得し env 注入
#   3) nginx vhost（443→React 静的・/api→127.0.0.1:8082）＋ certbot で TLS
#   4) systemd で Spring Boot を SPRING_PROFILES_ACTIVE=prod 起動
