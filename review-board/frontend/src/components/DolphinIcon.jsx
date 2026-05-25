// 水面を跳ねるバンドウイルカ（横向き）のロゴ用アイコン。水色（海・知性）の自作 SVG（依存なし）。
// ShibaIcon の置き換え。同じ I/F（className / aria-hidden）でドロップイン可能。
const AQUA = '#38BDF8'; // 体（水色・sky-400）
const LIGHT = '#BAE6FD'; // 腹側の明るい差し色（sky-200）
const DARK = '#0C4A6E'; // 目（sky-900）
const SPLASH = '#7DD3FC'; // しぶき（sky-300）

export default function DolphinIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {/* 体（くちばし=左上、反り返った背びれ=上、尾びれ=右下の跳躍ポーズ） */}
      <path
        d="M3 7.5
           C4.6 7.2 6 7.6 7 8.6
           C8.4 7.4 10.4 6.8 12.4 7
           C13.6 7.1 14.6 7.8 15 9
           C15.8 7 16.8 5.4 17.6 4.8
           C18.4 6 18.8 7.6 19.8 9.2
           C22.2 10.8 24.6 13 26.4 15.6
           C27 14.8 28.2 14 29.6 13.6
           C28.6 15 28 15.8 27.6 16.6
           C28.2 17.4 28.8 18.6 29 20
           C26.8 18.8 24.6 16.8 22.8 14.8
           C19 11.6 12.5 10.2 6 11.4
           C4.8 11.2 3.4 9.4 3 7.5 Z"
        fill={AQUA}
      />
      {/* 腹側の明るい差し色 */}
      <path
        d="M6 11.3 C12 10.4 18 11.6 22.8 14.6 C18.5 12.7 12.5 11.7 6.9 12.3 C6.3 12.1 6 11.7 6 11.3 Z"
        fill={LIGHT}
      />
      {/* 目 */}
      <circle cx="8.4" cy="9" r="0.9" fill={DARK} />
      {/* 水しぶき */}
      <circle cx="24" cy="20.5" r="0.9" fill={SPLASH} />
      <circle cx="21" cy="22" r="0.6" fill={SPLASH} />
      <circle cx="26.5" cy="22.2" r="0.55" fill={SPLASH} />
    </svg>
  );
}
