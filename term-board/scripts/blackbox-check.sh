#!/usr/bin/env bash
# ブラックボックス化検証スクリプト
#
# 用途:
#   - ローカル: 任意のタイミングで実行（`bash scripts/blackbox-check.sh`）
#   - pre-commit hook: `.git/hooks/pre-commit` から呼び出し（ステージ済ファイルのみ検査）
#   - CI: GitHub Actions から呼び出し（リポ全体を検査）
#
# 引数:
#   --staged  : git add 済みファイルのみ検査（pre-commit hook 用）
#   （引数なし）: リポ全体の追跡対象 .md を検査

set -euo pipefail

MODE="${1:-all}"

# 禁止語リスト（運用ガイドの対応表と一致させること）
BANNED=(
  "オールA"
  "S軸宣言"
  "S軸"
  "PDCAS"
  "品質4軸"
  "卓越の戦略"
  "ハイパワー・マーケティング"
  "ハイパワー"
  "庇護者"
  "S基準"
  "S判定表"
  "S判定"
  "A判定表"
  "A判定"
  "A基準"
  "A床"
  "弱点ゼロ"
  "床割れ"
  "床を割る"
  "床を割らない"
  "床は割れない"
  "不要を持たない"
  "短所を作らない"
  "判断カード"
  "派生元の原典"
  "付録A_判定表"
  "付録A判定表"
  "母要件定義書"
  "母§"
  "母 §"
  "母 S-"
  "母 P-"
  "母 M-"
  "母 SEC-"
)

# --- 追加禁止語をリポ外管理ファイルから読み込む ---------------------------
# 仕組み（このスクリプト）はリポに残すが、実際に隠したい語そのものは
# gitignore 済みの外部ファイルに置く（公開リポに語の一覧を残さないため）。
# 形式: 1行1語。# はコメント。「禁止語 => 代替表現」も可（=> 左側のみ採用）。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_WORDS="${BLACKBOX_WORDS_FILE:-$SCRIPT_DIR/blackbox-words.local.txt}"
if [ -f "$LOCAL_WORDS" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"          # 行内コメントを除去
    word="${line%%=>*}"         # 「=> 代替」形式は左側のみ
    word="$(printf '%s' "$word" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -n "$word" ] && BANNED+=("$word")
  done < "$LOCAL_WORDS"
fi

# 検査対象ファイル一覧を取得
# ※ scripts/blackbox-* と *-blackbox.yml はツール自身なので除外（自己参照防止）
if [ "$MODE" = "--staged" ]; then
  # pre-commit: ステージ済みかつテキストファイルのみ
  FILES=$(git diff --cached --name-only --diff-filter=ACM \
    | grep -E '\.(md|txt|yml|yaml|json|js|ts|tsx|jsx|py|java|gradle|sh|html|css)$' \
    | grep -v 'scripts/blackbox' \
    | grep -v '\-blackbox\.yml' \
    || true)
else
  # 全体検査: 追跡対象のテキストファイル
  FILES=$(git ls-files \
    | grep -E '\.(md|txt|yml|yaml|json|js|ts|tsx|jsx|py|java|gradle|sh|html|css)$' \
    | grep -v 'scripts/blackbox' \
    | grep -v '\-blackbox\.yml' \
    || true)
fi

if [ -z "$FILES" ]; then
  echo "[blackbox-check] 検査対象ファイルなし — OK"
  exit 0
fi

FOUND=0
for kw in "${BANNED[@]}"; do
  # ファイルごとに grep（バイナリ・存在しないファイル対策）
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ ! -f "$f" ] && continue
    if grep -Fn "${kw}" "$f" >/dev/null 2>&1; then
      echo "✘ 禁止語「${kw}」を検出: $f"
      grep -Fn "${kw}" "$f" | head -3 | sed 's/^/    /'
      FOUND=1
    fi
  done <<< "$FILES"
done

if [ $FOUND -ne 0 ]; then
  echo ""
  echo "==================================================================="
  echo " ブラックボックス化規律違反 — コミット/プッシュをブロックしました"
  echo "==================================================================="
  echo " 対処: scripts/blackbox-replace.py で一般化語彙に置換するか、"
  echo "       README.md の対応表に従って手動で書き換えてください。"
  echo "==================================================================="
  exit 1
fi

echo "[blackbox-check] 禁止語の残存なし — OK"
exit 0
