// 正面向きの豆柴（赤柴）アイコン。色は柴犬の代表色「赤」（赤柴）の暖色タン。
// ブランドの 🌱 を置き換えるロゴ用の自作 SVG（依存なし）。
const RED = '#C2682E'; // 赤柴の赤（暖かいタン）
const CREAM = '#FBEAD7'; // 口元・差し毛の白
const DARK = '#2B2620'; // 目・鼻

export default function ShibaIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {/* 耳（立ち耳） */}
      <path d="M6 3 L3.5 14.5 L13 9 Z" fill={RED} />
      <path d="M26 3 L28.5 14.5 L19 9 Z" fill={RED} />
      <path d="M6.8 6 L5.6 12.5 L11 9.2 Z" fill={CREAM} />
      <path d="M25.2 6 L26.4 12.5 L21 9.2 Z" fill={CREAM} />
      {/* 顔（赤） */}
      <path d="M16 6.5 C22 6.5 25.6 10.8 25.6 16.8 C25.6 23 21.6 27.8 16 27.8 C10.4 27.8 6.4 23 6.4 16.8 C6.4 10.8 10 6.5 16 6.5 Z" fill={RED} />
      {/* 口元・頬（白） */}
      <path d="M16 15 C20.4 15 22.8 18 22.8 21.3 C22.8 25 19.8 27.6 16 27.6 C12.2 27.6 9.2 25 9.2 21.3 C9.2 18 11.6 15 16 15 Z" fill={CREAM} />
      {/* 眉の差し毛（赤柴の特徴） */}
      <circle cx="11.6" cy="11.4" r="0.9" fill={CREAM} />
      <circle cx="20.4" cy="11.4" r="0.9" fill={CREAM} />
      {/* 目 */}
      <circle cx="11.8" cy="15" r="1.6" fill={DARK} />
      <circle cx="20.2" cy="15" r="1.6" fill={DARK} />
      {/* 鼻 */}
      <path d="M16 17.6 C17.1 17.6 18 18.4 18 19.3 C18 20.3 17.1 21 16 21 C14.9 21 14 20.3 14 19.3 C14 18.4 14.9 17.6 16 17.6 Z" fill={DARK} />
      {/* 口 */}
      <path d="M16 21 L16 23 M16 23 C16 24 14.8 24.6 13.7 24.3 M16 23 C16 24 17.2 24.6 18.3 24.3"
        stroke={DARK} strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </svg>
  );
}
