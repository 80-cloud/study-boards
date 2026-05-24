#!/bin/bash
# =====================================================================
# deploy.sh — EC2 上で「アプリのみ」を不変アーティファクトに切り替える（#161 / S-2）。
# cd-deploy.yml が SSM Run Command で `sudo /opt/review-board/deploy.sh <sha>` として呼ぶ。
#
# やること（インフラ破壊的変更ゼロ）：
#   1) S3 アーティファクトバケットから <sha> を releases/<sha> に取得（app.jar + dist）
#   2) current シンボリックリンクを切替（直前の向き先を previous に記録＝ロールバック余地）
#   3) systemd review-board を再起動、nginx をリロード
#   4) localhost の actuator/health が UP になるまで待機（失敗で非ゼロ終了）
#   5) 古いリリースを刈り取り（直近 KEEP 世代のみ保持）
# =====================================================================
set -euo pipefail

SHA="${1:?usage: deploy.sh <sha>}"
APP=/opt/review-board
ENV_FILE="$APP/env"
KEEP=5

[ -f "$ENV_FILE" ] || { echo "env がありません（provision.sh 未実行）: $ENV_FILE"; exit 1; }
ARTIFACTS_BUCKET="$(grep '^ARTIFACTS_BUCKET=' "$ENV_FILE" | cut -d= -f2-)"
[ -n "$ARTIFACTS_BUCKET" ] || { echo "ARTIFACTS_BUCKET が env に設定されていません"; exit 1; }

REL="$APP/releases/$SHA"
mkdir -p "$REL"
# IAM ロールで S3 から取得（静的キーなし）。app.jar と dist/ を同期。
aws s3 sync "s3://$ARTIFACTS_BUCKET/$SHA/" "$REL/" --only-show-errors
[ -f "$REL/app.jar" ] || { echo "app.jar が見つかりません: $REL"; exit 1; }
[ -d "$REL/dist" ]   || { echo "dist が見つかりません: $REL"; exit 1; }

# ロールバック用に直前の向き先を記録してから切替。
if [ -L "$APP/current" ]; then readlink -f "$APP/current" > "$APP/previous" || true; fi
ln -sfn "$REL" "$APP/current"
ln -sfn "$APP/current/dist" /var/www/review-board

systemctl restart review-board
nginx -t && nginx -s reload || systemctl reload nginx || true

# localhost ヘルスチェック（公開エンドポイント経由ではなく内部で確認）。
for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8082/actuator/health | grep -q '"status":"UP"'; then
    echo "deploy ok: sha=$SHA"
    # 古いリリースを刈り取り（current/previous は残す）。
    ls -1dt "$APP"/releases/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 3
done

echo "health check failed for sha=$SHA（ロールバックは docs/デプロイ・ロールバック手順.md 参照）"
exit 1
