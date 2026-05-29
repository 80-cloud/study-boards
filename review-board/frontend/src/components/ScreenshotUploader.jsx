import { useState } from 'react';
import { uploadScreenshot } from '../api/uploads';
import { getErrorMessage } from '../lib/errorMessages';
import ProgressBar from './ProgressBar';

// SEC-8：成果物スクショの選択→アップロード。返った key を onChange で親に渡す。
// プレビューは backend が返す署名付き URL を使う（private 保存・URL 経由でのみ表示）。
export default function ScreenshotUploader({ initialUrl = '', onChange }) {
  const [preview, setPreview] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // #500 P8：アップロード進捗（null=indeterminate）と表示用バイト数
  const [progress, setProgress] = useState(null);
  const [progressLabel, setProgressLabel] = useState('');

  const onSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    setProgress(0);
    setProgressLabel(`アップロード中… 0 / ${formatBytes(file.size)}`);
    try {
      const { key, url } = await uploadScreenshot(file, (pct, loaded, total) => {
        setProgress(pct);
        if (loaded != null && total != null) {
          setProgressLabel(`アップロード中… ${formatBytes(loaded)} / ${formatBytes(total)}`);
        }
      });
      setPreview(url);
      onChange(key);
    } catch (err) {
      // 非画像・サイズ超過は backend が 400/413。ユーザーに理由を返す。
      setError(getErrorMessage(err, 'アップロードできませんでした（PNG / JPEG / WebP・5MB まで）'));
    } finally {
      setBusy(false);
      setProgress(null);
      setProgressLabel('');
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
      {busy && <ProgressBar value={progress} label={progressLabel} className="mt-2" />}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {preview && (
        <img src={preview} alt="スクショプレビュー" className="mt-2 max-h-48 rounded border border-gray-200" />
      )}
    </div>
  );
}

// バイトを人間可読に。1024 進法・少数 1 桁。
function formatBytes(n) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
