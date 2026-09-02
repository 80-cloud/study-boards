#!/bin/bash
set -eux

# Corretto (Java 25) 導入
dnf install -y java-25-amazon-corretto-headless

# 専用サービスユーザー
id -u appuser &>/dev/null || useradd --system --shell /usr/sbin/nologin --no-create-home appuser

# アプリ配置
mkdir -p /opt/app
aws s3 cp s3://patch-canary-demo-artifacts-383158157670/app.jar /opt/app/app.jar
chown appuser:appuser /opt/app/app.jar

# systemdユニット(review-park backend / h2プロファイル / JWT_SECRETはapplication.propertiesのフォールバック既定値を使用)
cat > /etc/systemd/system/app.service << 'UNIT'
[Unit]
Description=review-park backend
After=network.target

[Service]
User=appuser
ExecStart=/usr/bin/java -jar /opt/app/app.jar --spring.profiles.active=h2
SuccessExitStatus=143
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now app

# ヘルスチェック(最大150秒待つ)
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://localhost:8080/posts; then
    echo "HEALTH_OK"
    exit 0
  fi
  sleep 5
done
echo "HEALTH_FAILED"
exit 1
