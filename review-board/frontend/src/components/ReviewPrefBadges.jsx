import { TONE_LABEL, ASPECT_LABEL, AI_USAGE_LABEL } from '../constants/reviewPrefs';

// F-SAFE-01 / F-REQ-01 / AI使用状況(#172)：投稿のトーン希望（多値）・募集観点・AI使用状況をバッジ表示（読み取り専用）。
// reviewers が「どんなレビューが歓迎か」「AI をどの程度使ったか」を一目で把握できるようにする。
export default function ReviewPrefBadges({ tones = [], aspects = [], aiUsage = null, className = '' }) {
  if ((!tones || tones.length === 0) && (!aspects || aspects.length === 0) && !aiUsage) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tones.map((t) => (
        <span key={t} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          🫶 {TONE_LABEL[t] ?? t}
        </span>
      ))}
      {aspects.map((a) => (
        <span key={a} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
          🔍 {ASPECT_LABEL[a] ?? a}
        </span>
      ))}
      {aiUsage && (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          🤖 {AI_USAGE_LABEL[aiUsage] ?? aiUsage}
        </span>
      )}
    </div>
  );
}
