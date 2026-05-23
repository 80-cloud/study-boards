// F-DRAFT-01：下書きを復元したことを知らせ、破棄も選べる小バナー。
export default function DraftNotice({ onDiscard }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
      <span>📝 前回の下書きを復元しました。</span>
      <button type="button" onClick={onDiscard} className="ml-3 text-blue-600 underline hover:text-blue-800">
        破棄して新規作成
      </button>
    </div>
  );
}
