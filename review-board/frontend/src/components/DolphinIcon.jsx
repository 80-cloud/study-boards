// 水面を跳ねるバンドウイルカ（横向き）のロゴ用アイコン。水色（海・知性）の自作 SVG（依存なし）。
// ShibaIcon の置き換え。同じ I/F（className / aria-hidden）でドロップイン可能。
const AQUA = '#38BDF8'; // 背側（水色・sky-400）
const LIGHT = '#EAF6FF'; // 腹側（よく見えるよう明るい近白の差し色）
const DARK = '#0C4A6E'; // 目（sky-900）
const SPLASH = '#7DD3FC'; // しぶき（sky-300）

export default function DolphinIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {/* 右向き（くちばし=右上）に水平反転。元データは左向きで作図し translate+scale で反転する。 */}
      <g transform="translate(32,0) scale(-1,1)">
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
        {/* 腹側（明るい近白で広めに＝お腹がはっきり見える） */}
        <path
          d="M4.5 9.1 C4.6 10.7 5.1 11.4 6 11.5 C12.5 10.3 19 11.7 22.9 14.9
             C18.4 11.4 11.6 9.5 6.8 10.2 C5.5 10.4 4.9 10 4.5 9.1 Z"
          fill={LIGHT}
        />
        {/* 目 */}
        <circle cx="8.4" cy="9" r="0.9" fill={DARK} />
        {/* 水しぶき */}
        <circle cx="24" cy="20.5" r="0.9" fill={SPLASH} />
        <circle cx="21" cy="22" r="0.6" fill={SPLASH} />
        <circle cx="26.5" cy="22.2" r="0.55" fill={SPLASH} />
      </g>
    </svg>
  );
}
