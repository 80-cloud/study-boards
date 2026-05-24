#!/bin/bash
# =====================================================================
# provision.sh — EC2 の「アプリ層」初期化（apply 後に一度だけ実行）。
# user_data.sh は土台（nginx/Java/SSM）まで。本スクリプトでアプリの器を整える：
#   - /opt/review-board ディレクトリと EnvironmentFile（SSM から機密を取得）
#   - systemd review-board.service の設置・有効化
#   - nginx vhost の設置（443→静的・/api→127.0.0.1:8082）
#   - TLS：DOMAIN 指定時は certbot(Let's Encrypt)、TLS_SELFSIGNED=1 時は自己署名証明書、
#          どちらも未指定なら HTTP のみ（後で手動 TLS）
# 実行例（ドメインあり / Let's Encrypt）：
#   sudo PUBLIC_ORIGIN=https://example.com DOMAIN=example.com \
#        /opt/review-board/infra-deploy/provision.sh
# 実行例（ドメイン無し / 自己署名・IP 直 HTTPS）：
#   sudo TLS_SELFSIGNED=1 PUBLIC_ORIGIN=https://18.176.19.160 \
#        /opt/review-board/infra-deploy/provision.sh
# アプリ本体（jar/dist）の配置は本スクリプトでは行わない。続けて deploy.sh <sha> を実行する。
# =====================================================================
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-1}"
SSM_PREFIX="${SSM_PREFIX:-/review-board/prod}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-}"   # 例: https://example.com（CORS 用。同一オリジンなら未指定でも可）
DOMAIN="${DOMAIN:-}"                 # certbot 用（指定で Let's Encrypt）
TLS_SELFSIGNED="${TLS_SELFSIGNED:-0}" # 1 で自己署名証明書（ドメイン無し・IP 直 HTTPS）
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

# --- nginx vhost ＋ TLS ---
# 既存の review-board conf を一旦撤去（HTTP/TLS どちらか一方のみ有効化するため）。
rm -f /etc/nginx/conf.d/review-board.conf /etc/nginx/conf.d/review-board-tls.conf

if [ "$TLS_SELFSIGNED" = "1" ]; then
  # 自己署名証明書モード（ドメイン無し・IP 直 HTTPS）。
  # EIP を SAN(IP) に含めることで「https://<EIP>」でのアクセスを証明書対象にする。
  EIP="$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 || echo '')"
  CN="${EIP:-review-board}"
  mkdir -p /etc/nginx/ssl
  if [ ! -f /etc/nginx/ssl/review-board.crt ]; then
    openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
      -keyout /etc/nginx/ssl/review-board.key \
      -out /etc/nginx/ssl/review-board.crt \
      -subj "/CN=$CN" \
      ${EIP:+-addext "subjectAltName=IP:$EIP"}
    chmod 600 /etc/nginx/ssl/review-board.key
  fi
  install -m 644 "$HERE/nginx-review-board-tls.conf" /etc/nginx/conf.d/review-board-tls.conf
  nginx -t && systemctl reload nginx
  echo "自己署名 TLS を設定（CN=$CN）。ブラウザ警告は想定どおり。"
elif [ -n "$DOMAIN" ]; then
  # Let's Encrypt モード。まず HTTP で起動し、certbot が 443/リダイレクトを追加する。
  install -m 644 "$HERE/nginx-review-board.conf" /etc/nginx/conf.d/review-board.conf
  nginx -t && systemctl reload nginx
  dnf install -y certbot python3-certbot-nginx || true
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    -m "${CERTBOT_EMAIL:-admin@$DOMAIN}" --redirect || \
    echo "certbot に失敗。DNS が EIP を指しているか確認し、手動で再実行してください。"
else
  # TLS なし（HTTP のみ）。JWT_COOKIE_SECURE=true 環境ではログイン不可になる点に注意。
  install -m 644 "$HERE/nginx-review-board.conf" /etc/nginx/conf.d/review-board.conf
  nginx -t && systemctl reload nginx
  echo "警告: TLS 未設定（HTTP のみ）。JWT_COOKIE_SECURE=true ではログインできません。"
fi

echo "provision 完了。次に deploy.sh <sha> でアプリを投入してください。"
