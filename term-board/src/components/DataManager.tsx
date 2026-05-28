import { useRef, useState } from "react";
import { repository } from "../api";

// F-PROG-04 / F-LOG-05: 学習データのエクスポート・インポート・進捗リセット。
// サーバー無しのためブラウザのデータをバックアップ・移行できるようにする。
type Status = { kind: "idle" | "ok" | "error"; message: string };

export function DataManager() {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const json = await repository.exportAll();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toLocaleDateString("sv-SE");
      a.href = url;
      a.download = `term-board-backup-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", message: "学習データをダウンロードしました。" });
    } catch {
      setStatus({ kind: "error", message: "エクスポートに失敗しました。" });
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const ok = await repository.importAll(text);
      if (ok) {
        setStatus({ kind: "ok", message: "インポートしました。画面を再読み込みします…" });
        // 各ビューは初回ロードで localStorage を読むため、確実に反映させるため再読込する。
        setTimeout(() => window.location.reload(), 800);
      } else {
        setStatus({ kind: "error", message: "ファイルの形式が正しくありません。" });
      }
    } catch {
      setStatus({ kind: "error", message: "インポートに失敗しました。" });
    }
  };

  const handleReset = async () => {
    if (!window.confirm("学習進捗（正答記録・学習日・面接ログ）を初期化します。作問とブックマークは残ります。よろしいですか？")) {
      return;
    }
    await repository.resetProgress();
    setStatus({ kind: "ok", message: "学習進捗を初期化しました。画面を再読み込みします…" });
    setTimeout(() => window.location.reload(), 800);
  };

  const card = "hig-card p-5";

  return (
    <div className={card}>
      <h2 className="text-sm font-semibold text-label">データ管理</h2>
      <p className="mt-1 text-xs text-label-2">
        データはこのブラウザにのみ保存されます。機種変更やバックアップにはエクスポートをご利用ください。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="hig-btn-primary px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          エクスポート（保存）
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-control bg-fill-quaternary px-4 py-2 text-sm font-semibold text-label transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          インポート（復元）
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-control bg-surface px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-300 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-300 dark:ring-rose-800 dark:hover:bg-rose-950"
        >
          進捗をリセット
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="バックアップファイルを選択"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = ""; // 同じファイルを連続選択できるようにリセット
          }}
        />
      </div>
      {status.kind !== "idle" && (
        <p
          className={`mt-3 text-sm ${
            status.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
          }`}
          role="status"
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
