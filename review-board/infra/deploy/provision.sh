#!/bin/bash
# =====================================================================
# provision.sh — EC2 の「アプリ層」初期化（apply 後に一度だけ実行）。
# user_data.sh は土台（nginx/Java/SSM）まで。本スクリプトでアプリの器を整える：
#   - /opt/review-board ディレクトリと EnvironmentFile（SSM から機密を取得）
#   - systemd review-board.service の設置・有効化
#   - nginx vhost の設置（443→静的・/api→127.0.0.1:8082）
#   - certbot による TLS（ドメイン指定時のみ・任意）
# 実行例（Session Manager もしくは SSM Run Command で root として）：
#   sudo PUBLIC_ORIGIN=https://example.com DOMAIN=example.com \
#        /opt/review-board/infra-deploy/provision.sh
# アプリ本体（jar/dist）の配置は本スクリプトでは行わない。続けて deploy.sh <sha> を実行する。
# =====================================================================
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-1}"
SSM_PREFIX="${SSM_PREFIX:-/review-board/prod}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-}"   # 例: https://example.com（CORS 用。同一オリジンなら未指定でも可）
DOMAIN="${DOMAIN:-}"                 # certbot 用（未指定なら TLS はスキップ＝後で手動）
APP=/opt/review-board
HERE="$(cd "$(dirname "$0")" && pwd)"

ssm() { aws ssm get-parameter --with-decryption --region "$REGION" \
          --name "$SSM_PREFIX/$1" --query 'Parameter.Value' --output text 2>/dev/null || true; }

id -u reviewboard >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin reviewboard || true
mkdir -p "$APP/releases" /var/www
chown -R reviewboard:reviewboard "$APP" || true

# --- EnvironmentFile（機密は SSM、静的値はここで固定） ---
umask 077
cat > "$APP/env" <<EOF
SPRING_PROFILES_ACTIVE=prod
JWT_COOKIE_SECURE=true
JWT_SECRET=$(ssm JWT_SECRET)
DATABASE_URL=$(ssm DATABASE_URL)
DATABASE_USERNAME=reviewboard
DATABASE_PASSWORD=$(ssm DATABASE_PASSWORD)
S3_BUCKET=$(ssm S3_BUCKET)
S3_REGION=$REGION
ARTIFACTS_BUCKET=$(ssm ARTIFACTS_BUCKET)
CORS_ALLOWED_ORIGINS=$PUBLIC_ORIGIN
BOOTSTRAP_ADMIN_EMAIL=$(ssm BOOTSTRAP_ADMIN_EMAIL)
BOOTSTRAP_ADMIN_PASSWORD=$(ssm BOOTSTRAP_ADMIN_PASSWORD)
EOF
chmod 600 "$APP/env"
# SEED_PASSWORD は本番では設定しない（prod プロファイルは seeder 非活性だが二重に明示）。

# --- deploy.sh を所定パスへ設置（cd-deploy が /opt/review-board/deploy.sh を SSM 実行する） ---
install -m 755 "$HERE/deploy.sh" "$APP/deploy.sh"

# --- systemd ユニット ---
install -m 644 "$HERE/review-board.service" /etc/systemd/system/review-board.service
systemctl daemon-reload
systemctl enable review-board

# --- nginx vhost ---
install -m 644 "$HERE/nginx-review-board.conf" /etc/nginx/conf.d/review-board.conf
nginx -t && systemctl reload nginx

# --- TLS（任意・ドメイン指定時のみ） ---
if [ -n "$DOMAIN" ]; then
  dnf install -y certbot python3-certbot-nginx || true
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    -m "${CERTBOT_EMAIL:-admin@$DOMAIN}" --redirect || \
    echo "certbot に失敗。DNS が EIP を指しているか確認し、手動で再実行してください。"
fi

echo "provision 完了。次に deploy.sh <sha> でアプリを投入してください。"
