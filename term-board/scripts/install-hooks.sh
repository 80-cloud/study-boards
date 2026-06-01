#!/usr/bin/env bash
# git pre-commit hook をインストール
#
# 用途: 新規リポ立ち上げ時、または既存リポでフックを有効化したい時に1回だけ実行
#       bash scripts/install-hooks.sh

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || {
  echo "✘ git リポジトリではありません。先に 'git init' を実行してください。"
  exit 1
})

HOOK_DIR="${REPO_ROOT}/.git/hooks"
HOOK_FILE="${HOOK_DIR}/pre-commit"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_FILE" <<'EOF'
#!/usr/bin/env bash
# ブラックボックス化 pre-commit hook
# scripts/blackbox-check.sh を --staged モードで実行
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CHECK="${REPO_ROOT}/term-board/scripts/blackbox-check.sh"

if [ -x "$CHECK" ]; then
  bash "$CHECK" --staged
else
  echo "⚠ blackbox-check.sh が見つからない/実行不可。チェックをスキップ。"
fi
EOF

chmod +x "$HOOK_FILE"
chmod +x "${REPO_ROOT}/term-board/scripts/blackbox-check.sh"

echo "✓ pre-commit hook をインストールしました: $HOOK_FILE"
echo "  以降、'git commit' 時に自動でブラックボックス化検証が走ります。"
echo "  バイパスする場合は git commit --no-verify （非推奨）"
