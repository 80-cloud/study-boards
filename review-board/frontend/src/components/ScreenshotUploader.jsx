import { useState } from 'react';
import { uploadScreenshot } from '../api/uploads';

// SEC-8：成果物スクショの選択→アップロード。返った key を onChange で親に渡す。
// プレビューは backend が返す署名付き URL を使う（private 保存・URL 経由でのみ表示）。
export default function ScreenshotUploader({ initialUrl = '', onChange }) {
  const [preview, setPreview] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const { key, url } = await uploadScreenshot(file);
      setPreview(url);
      onChange(key);
    } catch (err) {
      // 非画像・サイズ超過は backend が 400/413。ユーザーに理由を返す。
      setError(err.response?.data?.message || 'アップロードに失敗しました（PNG/JPEG/WebP・5MB まで）');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor="screenshot-file" className="mb-1 block text-sm text-gray-600">スクリーンショット（任意・PNG/JPEG/WebP・5MB まで）</label>
      <input
        id="screenshot-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onSelect}
        disabled={busy}
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:text-blue-700 hover:file:bg-blue-100"
      />
      {busy && <p className="mt-1 text-sm text-gray-500">アップロード中…</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {preview && (
        <img src={preview} alt="スクショプレビュー" className="mt-2 max-h-48 rounded border border-gray-200" />
      )}
    </div>
  );
}
