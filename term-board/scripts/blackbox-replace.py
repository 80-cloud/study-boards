#!/usr/bin/env python3
"""
ブラックボックス化規律違反の一括置換ヘルパー

用途:
  python3 scripts/blackbox-replace.py <path-or-glob> [<path-or-glob> ...]
  python3 scripts/blackbox-replace.py docs/        # ディレクトリ再帰
  python3 scripts/blackbox-replace.py --dry-run docs/要件定義書.md

挙動:
  - --dry-run: 置換対象を表示するだけ（書き換えない）
  - 通常: ファイルを上書き
"""

import os, sys, pathlib

# 置換ルール（長い順に並べる — substring 関係に注意）
REPLACEMENTS = [
    # 概念フレーズ（複合・長い順）
    ("不要を持たない＝床割れリスク回避", "過剰機能を持たない＝品質低下リスク回避"),
    ("不要を切って短所を作らない", "過剰機能を切って弱点を作らない"),
    ("不要を持たない＝短所を作らない", "過剰機能を持たない＝弱点を作らない"),
    ("便利さより安全＝不要を持たない", "便利さより安全＝過剰機能を持たない"),
    ("床を割らない約束", "品質低下を許さない約束"),
    ("不要な床割れリスク", "過剰機能による品質低下リスク"),
    ("不要を持つと床割れリスク", "過剰機能を持つと品質低下リスク"),
    ("派生元の原典", "共通の設計方針"),
    # 章節参照
    ("共通方針の§0-3・§4-1 第0項に従い", "共通方針の品質方針宣言に従い"),
    ("共通の第2部 MUST 要件", "共通の品質指標群 MUST 要件"),
    ("第3部 §3-1（ログ・監視・オブザーバビリティ）", "横断要件群 §3-1（ログ・監視・オブザーバビリティ）"),
    ("「第3部 横断要件」", "「横断要件群」"),
    ("第3部 横断要件", "横断要件群"),
    ("第3部", "横断要件群"),
    ("第2部", "品質指標群"),
    # ファイル名・付録
    ("付録A_判定表.md", "品質判定表.md"),
    ("付録A判定表", "品質判定表"),
    ("付録A ベースライン判定表／重点判定表", "品質判定表"),
    ("付録A ベースライン判定表", "品質判定表"),
    ("付録A 判定表", "品質判定表"),
    ("付録ベースライン判定表.md", "品質判定表.md"),
    ("付録ベースライン判定表", "品質判定表"),
    # 母 → 共通方針
    ("母要件定義書", "共通の設計方針"),
    ("母「§", "共通方針「§"),
    ("母 §", "共通方針 §"),
    ("母§", "共通方針 §"),
    # 概念単独
    ("弱点ゼロの床", "全軸基準達成"),
    ("弱点ゼロ", "全軸基準達成"),
    ("床を割る", "品質低下を起こす"),
    ("床は割れない", "品質低下は起きない"),
    ("床割れリスク", "品質低下リスク"),
    ("床割れ", "品質低下"),
    ("判断カード", "設計判断資料"),
    # 派生語（長い順）
    ("S判定表", "重点判定表"),
    ("A判定表", "ベースライン判定表"),
    ("A基準", "ベースライン基準"),
    ("S基準", "重点基準"),
    ("S判定", "重点判定"),
    ("A判定", "ベースライン判定"),
    ("A床", "ベースライン床"),
    # 大カテゴリ
    ("S軸宣言", "重点軸宣言"),
    ("S軸", "重点軸"),
    ("オールA", "全軸ベースライン以上"),
    ("PDCAS", "改善サイクル"),
    ("品質4軸", "品質指標"),
    ("卓越の戦略", "重点戦略"),
    # 母 ID 接頭辞（最後）
    ("母 S-", "S-"),
    ("母 P-", "P-"),
    ("母 M-", "M-"),
    ("母 SEC-", "SEC-"),
    ("母 F-", "F-"),
    ("母 R-", "R-"),
    ("母 C-", "C-"),
    ("母S-", "S-"),
    ("母P-", "P-"),
    ("母M-", "M-"),
    ("母SEC-", "SEC-"),
]

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
