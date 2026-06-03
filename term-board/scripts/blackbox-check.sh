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

# 禁止語リストはリポ外管理（公開リポに語の一覧を残さない）。
# 実際の語は gitignore 済み blackbox-words.local.txt に置き、下の読込処理で取り込む。
# CI では Secret から同ファイルを復元する。
BANNED=()

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

# 定義が 1 件も無い（外部ファイル未配置）なら検査をスキップ（"OK" の誤表示を防ぐ）。
if [ ${#BANNED[@]} -eq 0 ]; then
  echo "[blackbox-check] ルール定義（blackbox-words.local.txt）が見つからないため検査をスキップ"
  exit 0
fi

# 検査対象ファイル一覧を取得
# ※ scripts/blackbox-* と *-blackbox.yml はツール自身なので除外（自己参照防止）
# 注: `-c core.quotepath=false` が必須。これが無いと git は非ASCIIパスを
#     `"...\350\246\201...md"` とクォート出力し、末尾が `"` になるため拡張子フィルタ
#     `\.md$` に外れ、日本語名ファイル（要件定義書.md 等）がサイレントに検査対象外になる。
if [ "$MODE" = "--staged" ]; then
  # pre-commit: ステージ済みかつテキストファイルのみ
  FILES=$(git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM \
    | grep -E '\.(md|txt|yml|yaml|json|js|ts|tsx|jsx|py|java|gradle|sh|html|css)$' \
    | grep -v 'scripts/blackbox' \
    | grep -v '\-blackbox\.yml' \
    || true)
else
  # 全体検査: 追跡対象のテキストファイル
  FILES=$(git -c core.quotepath=false ls-files \
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
