import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 要件定義書 §ローカルポート: term-board は 5176 固定（他アプリと分離・CLAUDE.md §10）。
// 別ポートでの代替起動は禁止のため strictPort: true で競合時はエラーにする。
//
// base: GitHub Pages のサブパス配信用（Issue #285）。
// 公開URL = https://80-cloud.github.io/hideharu-AI/term-board/ なので、
// 本番ビルドのアセット参照を "/hideharu-AI/term-board/" 起点にする。
// dev（npm run dev）では base は "/" 相当で問題なく動く（プロダクションビルドのみ影響）。
export default defineConfig({
  base: "/hideharu-AI/term-board/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
    strictPort: true,
  },
});
