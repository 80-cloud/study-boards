import { useCallback, useEffect, useRef, useState } from 'react';

// アバター切り抜き（正方形固定＋ズーム/移動・円プレビュー）。
// 選択画像を canvas で正方形に書き出し、cropped File を onCropped に渡す（アップロードは親が担当）。
// ライブラリ非依存：表示は object URL、出力は toBlob('image/jpeg')。
const VIEW = 320; // 切り抜き枠（正方形）の表示サイズ(px)
const OUT = 384; // 出力解像度（正方形・px）
const MAX_ZOOM = 3;

export default function AvatarCropper({ file, onCancel, onCropped }) {
  const [img, setImg] = useState(null); // HTMLImageElement
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef(null);

  // ファイル → object URL → Image（読み込み後に状態へ）。URL は解放する。
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // zoom=1 で短辺が枠いっぱい（cover）。
  const coverScale = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = coverScale * zoom;
  const dw = img ? img.naturalWidth * scale : 0;
  const dh = img ? img.naturalHeight * scale : 0;

  // 画像が常に枠を覆うよう offset を制限。
  const clamp = useCallback((o) => {
    const mx = Math.max(0, (dw - VIEW) / 2);
    const my = Math.max(0, (dh - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  }, [dw, dh]);

  useEffect(() => { setOffset((o) => clamp(o)); }, [zoom, clamp]);

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setOffset(clamp({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    }));
  };
  const onPointerUp = () => { drag.current = null; };

  // 枠内の正方形を元画像座標へ写し、OUT×OUT に書き出す。
  const confirm = () => {
    if (!img) return;
    setBusy(true);
    const left = VIEW / 2 - dw / 2 + offset.x;
    const top = VIEW / 2 - dh / 2 + offset.y;
    const srcX = -left / scale;
    const srcY = -top / scale;
    const srcSize = VIEW / scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) { onCancel(); return; }
        onCropped(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  };

  const left = VIEW / 2 - dw / 2 + offset.x;
  const top = VIEW / 2 - dh / 2 + offset.y;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="アバターを切り抜き">
      <div className="mac-card w-full max-w-sm p-6">
        <h3 className="mac-h mb-1 text-lg">アバターを切り抜き</h3>
        <p className="mb-4 text-xs text-gray-500">ドラッグで位置調整・スライダーで拡大。円の内側が表示されます。</p>

        {/* 切り抜きビュー（正方形・円マスクで仕上がりを示す） */}
        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-gray-100"
          style={{ width: VIEW, height: VIEW, cursor: drag.current ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable="false"
              style={{ position: 'absolute', left, top, width: dw, height: dh, maxWidth: 'none' }}
            />
          )}
          {/* 円マスク（外側を黒く覆って隠し、円の内側だけを見せる） */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.72)', WebkitMaskImage: 'radial-gradient(circle closest-side at center, transparent 99%, #000 100%)', maskImage: 'radial-gradient(circle closest-side at center, transparent 99%, #000 100%)' }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-black/80" />
        </div>

        {/* ズーム */}
        <label className="mt-4 block">
          <span className="mac-label">拡大</span>
          <input
            type="range"
            min="1"
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-navy-700"
            aria-label="拡大率"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="mac-btn-ghost">キャンセル</button>
          <button type="button" onClick={confirm} disabled={!img || busy} className="mac-btn-navy">
            {busy ? '処理中…' : 'この範囲で決定'}
          </button>
        </div>
      </div>
    </div>
  );
}
