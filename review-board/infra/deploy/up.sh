#!/usr/bin/env bash
#
# up.sh — review-board 本番をオンデマンド起動する（時間制限コスト抑制の「起動」側）。
#
# やること：
#   (1) RDS(review-board-prod-db) を起動（停止中なら）
#   (2) EC2(review-board-prod-ec2) を起動（停止中なら）
#   (3) 両方の Ready を待機 → EIP(同じIP)で復帰 → ヘルスチェック
#
# 前提：
#   - EIP のため public IP は停止/再開で変わらない（Discord 共有URLは維持される）。
#   - アプリは systemd(review-board.service, enable 済) + nginx(enable 済) で
#     インスタンス起動時に自動復帰する（手動デプロイ不要）。
#   - 対象は review-board の本番リソースのみ。recipe-board / task-board には触れない。
#
# 使い方：
#   ./up.sh            # 起動
#   ./up.sh --dry-run  # 実行せず対象と現状だけ表示
#
set -euo pipefail

REGION="ap-northeast-1"
EC2_NAME="review-board-prod-ec2"
DB_ID="review-board-prod-db"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# ---- ログ整形（sns-board の作法を踏襲） ----
c() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
log()  { c "0;36" "==> $*"; }
ok()   { c "0;32" "OK  $*"; }
warn() { c "1;33" "!!  $*"; }
err()  { c "0;31" "ERR $*" >&2; }

# ---- 対象 EC2 を Name タグから厳密解決（必ず1台に限定） ----
resolve_ec2() {
  aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:Name,Values=${EC2_NAME}" "Name=instance-state-name,Values=stopped,stopping,running,pending" \
    --query 'Reservations[].Instances[].InstanceId' --output text
}

INSTANCE_ID="$(resolve_ec2)"
if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
  err "EC2(Name=${EC2_NAME}) が見つかりません。"; exit 1
fi
if [ "$(printf '%s\n' "$INSTANCE_ID" | wc -w)" -ne 1 ]; then
  err "EC2 が複数該当しました（誤爆防止のため中止）: ${INSTANCE_ID}"; exit 1
fi

EC2_STATE="$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' --output text)"
DB_STATE="$(aws rds describe-db-instances --region "$REGION" --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].DBInstanceStatus' --output text)"

log "対象  EC2=${INSTANCE_ID}(${EC2_NAME}, 現状:${EC2_STATE}) / RDS=${DB_ID}(現状:${DB_STATE}) / region=${REGION}"

if [ "$DRY_RUN" -eq 1 ]; then
  warn "--dry-run：実行はしません。RDS を available へ、EC2 を running へ起動する想定です。"
  exit 0
fi

# ---- (1) RDS 起動（停止中のときだけ） ----
if [ "$DB_STATE" = "stopped" ]; then
  log "RDS 起動中…"
  aws rds start-db-instance --region "$REGION" --db-instance-identifier "$DB_ID" >/dev/null
else
  warn "RDS は ${DB_STATE} のため start 不要（スキップ）。"
fi

# ---- (2) EC2 起動（停止中のときだけ） ----
if [ "$EC2_STATE" = "stopped" ]; then
  log "EC2 起動中…"
  aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
else
  warn "EC2 は ${EC2_STATE} のため start 不要（スキップ）。"
fi

# ---- (3) Ready 待機 ----
log "RDS が available になるまで待機（数分かかります）…"
aws rds wait db-instance-available --region "$REGION" --db-instance-identifier "$DB_ID"
ok "RDS available"

log "EC2 が running になるまで待機…"
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
ok "EC2 running"

PUB_IP="$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
log "アプリ(systemd)起動を待ってヘルスチェック（最大90秒）… https://${PUB_IP}/"
for i in $(seq 1 18); do
  code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 "https://${PUB_IP}/actuator/health" || true)"
  if [ "$code" = "200" ]; then ok "アプリ応答 200（https://${PUB_IP}/ で閲覧可）"; exit 0; fi
  sleep 5
done
warn "ヘルスチェックが 200 になりませんでした。EC2/RDS は起動済みですが、アプリ(java/nginx)の起動完了に少し時間がかかっている可能性があります。1〜2分後に https://${PUB_IP}/ を再確認してください。"
