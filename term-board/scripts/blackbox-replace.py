#!/usr/bin/env python3
"""
表記の一括置換ヘルパー（判定ルールは外部ファイルで管理）

用途:
  python3 scripts/blackbox-replace.py <path-or-glob> [<path-or-glob> ...]
  python3 scripts/blackbox-replace.py docs/        # ディレクトリ再帰
  python3 scripts/blackbox-replace.py --dry-run docs/要件定義書.md

挙動:
  - --dry-run: 置換対象を表示するだけ（書き換えない）
  - 通常: ファイルを上書き

ルール定義:
  仕組み（このスクリプト）はリポに残すが、判定ルールそのものは
  リポ外管理（gitignore 済み）の blackbox-words.local.txt に置く。
  形式は「対象表記 => 置換後表記」を 1 行 1 件。`#` 以降はコメント。
  CI では Secret から同ファイルを復元する。
  環境変数 BLACKBOX_WORDS_FILE で定義ファイルの場所を上書きできる。
"""

import os, sys, pathlib


def load_replacements():
    """外部定義ファイルから (対象, 置換後) のリストを読み込む。"""
    p = os.environ.get("BLACKBOX_WORDS_FILE") or str(
        pathlib.Path(__file__).resolve().parent / "blackbox-words.local.txt")
    rules = []
    if os.path.isfile(p):
        with open(p, encoding="utf-8") as fh:
            for line in fh:
                line = line.split("#", 1)[0].strip()
                if "=>" in line:
                    a, b = (x.strip() for x in line.split("=>", 1))
                    if a and b:
                        rules.append((a, b))
    # 長い順に並べる（substring 関係での誤置換を防ぐ）
    rules.sort(key=lambda r: -len(r[0]))
    return rules


REPLACEMENTS = load_replacements()

TEXT_EXTS = {".md", ".txt", ".yml", ".yaml", ".json", ".js", ".ts", ".tsx",
             ".jsx", ".py", ".java", ".gradle", ".sh", ".html", ".css"}


def collect_files(paths):
    files = []
    for p in paths:
        path = pathlib.Path(p)
        if path.is_dir():
            for sub in path.rglob("*"):
                if sub.is_file() and sub.suffix in TEXT_EXTS:
                    files.append(sub)
        elif path.is_file():
            files.append(path)
    return files


def apply_to_file(path, dry_run=False):
    try:
        src = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None
    dst = src
    counts = {}
    for old, new in REPLACEMENTS:
        c = dst.count(old)
        if c:
            counts[old] = c
            dst = dst.replace(old, new)
    if dst != src and not dry_run:
        path.write_text(dst, encoding="utf-8")
    return counts


def main():
    args = sys.argv[1:]
    dry_run = False
    if "--dry-run" in args:
        dry_run = True
        args.remove("--dry-run")
    if not args:
        print("usage: blackbox-replace.py [--dry-run] <path-or-dir> [...]")
        sys.exit(2)

    if not REPLACEMENTS:
        print("ルール定義（blackbox-words.local.txt）が見つかりません。"
              "リポ外管理の定義ファイルを配置してください。")
        sys.exit(1)

    files = collect_files(args)
    total_files = 0
    total_replacements = 0
    for f in files:
        result = apply_to_file(f, dry_run)
        if result:
            total_files += 1
            total_replacements += sum(result.values())
            print(f"{'(dry) ' if dry_run else ''}{f}: {result}")

    print(f"--- {total_files} files, {total_replacements} replacements"
          f"{' (dry-run)' if dry_run else ''} ---")


if __name__ == "__main__":
    main()
