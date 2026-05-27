import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 要件定義書 §ローカルポート: term-board は 5176 固定（他アプリと分離・CLAUDE.md §10）。
// 別ポートでの代替起動は禁止のため strictPort: true で競合時はエラーにする。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
    strictPort: true,
  },
});
