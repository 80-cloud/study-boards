# IT用語ボード（term-board）

IT業界への就職・転職を目指す**未経験者**向けの、IT用語学習アプリ。
4択クイズで知識を定着させ、用語を「**面接で自分の言葉で言える**」まで運ぶことを目的とする。

## 🌐 公開URL（誰でも使えます・ログイン不要）

**https://80-cloud.github.io/hideharu-AI/term-board/**

- **ログイン不要。** URLを開けばすぐに学習を始められます。
- **進捗はお使いのブラウザに保存されます**（localStorage）。アカウントもサーバーもありません。
- 別の端末・別のブラウザではそれぞれ独立した進捗になります（端末間の同期はしません）。
- スマホのスキマ時間にも使えるようモバイル最適化しています。

### 📣 Discord などで共有する

上記URLを Discord・X・LINE などに貼るだけで誰でも使えます。
URLを貼ると **タイトル・説明つきのリンクプレビュー**（OGP）が表示されます。

```
IT用語ボードで面接対策しよう（ログイン不要・無料）
https://80-cloud.github.io/hideharu-AI/term-board/
```

> 補足：プレビューに画像サムネイルも出したい場合は、`og:image`（絶対URLのPNG/JPG）を
> 追加すればOK。現状はテキストのみのプレビュー（タイトル＋説明）で軽量に共有できます。

> なぜアカウントが無いのか：学習アプリは各自が一人で使い、データを他人と共有しません。
> 不要な認証・サーバーを持たないことで、安全（攻撃面ゼロ）・無料・高速を実現しています
> （詳細は [docs/要件定義書.md](./docs/要件定義書.md) §1-5）。

## 🛠 技術スタック

| レイヤ | 採用 |
|---|---|
| フロント | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| 永続化 | localStorage（`api/` 層で隔離。将来サーバー化時は差し替えのみ） |
| ホスティング | GitHub Pages（静的配信・GitHub Actions で自動デプロイ） |
| Node | 24 LTS（`.nvmrc` 固定） |

## 💻 ローカル開発

```bash
# Node 24 を使う（nvm 利用時）
nvm use            # .nvmrc により 24 LTS

npm install
npm run dev        # http://localhost:5176/ で起動
npm run build      # 本番ビルド（dist/）
npm run preview    # 本番ビルドをローカル確認（base付き = /hideharu-AI/term-board/）
```

> ポートは **5176 固定**（他アプリと分離・[../CLAUDE.md](../CLAUDE.md) §10）。

## 🚀 公開（デプロイ）

`main` ブランチへ `term-board/**` の変更が入ると、GitHub Actions
（[../.github/workflows/term-board-pages.yml](../.github/workflows/term-board-pages.yml)）が
自動でビルドして GitHub Pages へ公開します。手動実行（workflow_dispatch）も可能です。

## 📂 構成

```
term-board/
├── src/
│   ├── api/          # データ取得・保存の隔離層（localStorage実装）
│   ├── hooks/        # 学習ロジック（useQuiz 等）
│   ├── components/   # 表示
│   ├── data/         # 用語データ（terms.json）
│   └── types.ts      # Term / Progress 型
└── docs/要件定義書.md
```
