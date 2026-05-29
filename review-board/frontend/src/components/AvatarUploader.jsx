import { useState } from 'react';
import { uploadScreenshot } from '../api/uploads';
import AvatarCropper from './AvatarCropper';
import { getErrorMessage } from '../lib/errorMessages';

// アバター選択 → 正方形に切り抜き → アップロード（SEC-8：返った key を onChange で親へ）。
// プレビューは署名付き URL（private 保存・URL 経由でのみ表示）。
// ファイル選択は <label>＋視覚的に隠した input で行う（display:none の input への JS click は
// Safari/WebKit でブロックされるため。label 経由なら全ブラウザでネイティブに開く）。
export default function AvatarUploader({ initialUrl = '', onChange }) {
  const [preview, setPreview] = useState(initialUrl);
  const [pending, setPending] = useState(null); // 切り抜き対象の元ファイル
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setError(''); setPending(file); }
    e.target.value = ''; // 同じファイルを選び直せるようにリセット
  };

  const onCropped = async (croppedFile) => {
    setPending(null);
    setBusy(true);
    try {
      const { key, url } = await uploadScreenshot(croppedFile);
      setPreview(url);
      onChange(key);
    } catch (err) {
      setError(getErrorMessage(err, 'アップロードできませんでした（PNG / JPEG / WebP・5MB まで）'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        {preview
          ? <img src={preview} alt="アバタープレビュー" className="h-24 w-24 rounded-full border border-black/5 object-cover shadow-mac-sm" />
          : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-3xl text-gray-400">🙂</span>}
        <label className={`mac-btn-ghost cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          {busy ? 'アップロード中…' : preview ? '画像を変更' : '画像を選ぶ'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onSelect}
            className="sr-only"
          />
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {pending && (
        <AvatarCropper file={pending} onCancel={() => setPending(null)} onCropped={onCropped} />
      )}
    </div>
  );
}
