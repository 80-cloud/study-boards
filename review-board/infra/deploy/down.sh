#!/usr/bin/env bash
#
# down.sh — review-board 本番をオンデマンド停止する（時間制限コスト抑制の「停止」側）。
#
# やること：
#   (1) EC2(review-board-prod-ec2) を停止（稼働中なら）— 先にアプリ側を落とす
#   (2) RDS(review-board-prod-db) を停止（available なら）
#
# 重要な性質：
#   - これは「停止(stop)」であり削除ではない。データ・EBS・EIP は保持され、
#     up.sh で同じ IP のまま数分で復帰できる（Discord 共有URLは維持）。
#   - 停止中も EBS と パブリックIPv4(EIP) の少額課金は継続する（削れるのは EC2/RDS の計算費）。
#   - RDS は仕様上「停止後 最大7日で自動再開」する。長期に止めたい場合も up/down を回す前提。
#   - 対象は review-board の本番リソースのみ。recipe-board / task-board には触れない。
#
# 使い方：
#   ./down.sh            # 確認プロンプトの後に停止
#   ./down.sh --dry-run  # 実行せず対象と現状だけ表示
#   ./down.sh --yes      # 確認プロンプトをスキップ（自動化用・取り扱い注意）
#
set -euo pipefail

REGION="ap-northeast-1"
EC2_NAME="review-board-prod-ec2"
DB_ID="review-board-prod-db"
DRY_RUN=0
ASSUME_YES=0
case "${1:-}" in
  --dry-run) DRY_RUN=1 ;;
  --yes)     ASSUME_YES=1 ;;
  "")        ;;
  *) echo "unknown option: $1"; exit 2 ;;
esac

c() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
log()  { c "0;36" "==> $*"; }
ok()   { c "0;32" "OK  $*"; }
warn() { c "1;33" "!!  $*"; }
err()  { c "0;31" "ERR $*" >&2; }

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
  warn "--dry-run：実行はしません。EC2 を stopped へ、RDS を stopped へ停止する想定です。"
  exit 0
fi

# ---- 確認（停止＝本番をオフラインにする操作のため） ----
if [ "$ASSUME_YES" -ne 1 ]; then
  warn "本番(review-board)を停止します。停止中は https://${REGION} のサイトはオフラインになります（データ・URLは保持）。"
  printf "  上記の review-board リソースのみを停止します。実行しますか? [yes/NO]: "
  read -r ans
  if [ "$ans" != "yes" ]; then err "中止しました。"; exit 1; fi
fi

# ---- (1) EC2 停止（稼働中のときだけ）— 先にアプリ側を落とす ----
if [ "$EC2_STATE" = "running" ]; then
  log "EC2 停止中…"
  aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
  aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"
  ok "EC2 stopped"
else
  warn "EC2 は ${EC2_STATE} のため stop 不要（スキップ）。"
fi

# ---- (2) RDS 停止（available のときだけ） ----
if [ "$DB_STATE" = "available" ]; then
  log "RDS 停止中…"
  aws rds stop-db-instance --region "$REGION" --db-instance-identifier "$DB_ID" >/dev/null
  ok "RDS 停止リクエスト受付（stopped まで数分。完了は describe-db-instances で確認可）"
else
  warn "RDS は ${DB_STATE} のため stop 不要（スキップ）。"
fi

ok "停止手続き完了。再開は ./up.sh（同じ IP で復帰）。"
warn "注意：RDS は最大7日で自動再開します。長く止める場合も up/down の運用を継続してください。"
