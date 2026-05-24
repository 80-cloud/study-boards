import { TONE_OPTIONS, ASPECT_OPTIONS, AI_USAGE_OPTIONS } from '../constants/reviewPrefs';

// F-SAFE-01 / F-REQ-01 / AI使用状況(#172)：投稿フォームのトーン（多値）・募集観点（多値）・AI使用状況（単一）入力。
// UI 案D「タグ入力パネル」：トーンはトグルピル（複数可）、観点は選択タグ＋候補、AI は単一ピル。
// props: tones(string[]), aspects(string[]), aiUsage(string|null), onTonesChange, onAspectsChange, onAiUsageChange。

// 単一選択ピル（ラジオ相当）。選択は navy 塗り、未選択は白＋極薄リング。
function RadioPill({ checked, onClick, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        checked ? 'bg-navy-700 font-semibold text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-black/10 hover:ring-black/20'
      }`}
    >
      {children}
    </button>
  );
}

// 多値トグルピル。選択は navy 塗り、未選択は白＋極薄リング。
function TogglePill({ pressed, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        pressed ? 'bg-navy-700 font-semibold text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-black/10 hover:ring-black/20'
      }`}
    >
      {children}
    </button>
  );
}

export default function ReviewPrefFields({
  tones = [], aspects = [], aiUsage = null, onTonesChange, onAspectsChange, onAiUsageChange,
}) {
  const toggleTone = (value) =>
    onTonesChange(tones.includes(value) ? tones.filter((t) => t !== value) : [...tones, value]);

  const addAspect = (value) => onAspectsChange([...aspects, value]);
  const removeAspect = (value) => onAspectsChange(aspects.filter((a) => a !== value));

  // 観点：選択済み／候補（未選択）に分ける。元の定義順を保つ。
  const selected = ASPECT_OPTIONS.filter((o) => aspects.includes(o.value));
  const candidates = ASPECT_OPTIONS.filter((o) => !aspects.includes(o.value));

  return (
    <fieldset className="mb-4 rounded-2xl border border-black/10 bg-black/[0.02] p-5">
      <legend className="px-1 text-sm font-semibold text-navy-700">レビューの希望（任意）</legend>

      {/* トーン（多値・トグル） */}
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-700">どんなトーンが歓迎ですか？</p>
        <span className="text-xs text-gray-400">複数選べます</span>
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="希望トーン">
        {TONE_OPTIONS.map((o) => (
          <span key={o.value} title={o.hint}>
            <TogglePill pressed={tones.includes(o.value)} onClick={() => toggleTone(o.value)}>{o.label}</TogglePill>
          </span>
        ))}
      </div>

      {/* 募集観点（多値）：選択はタグ、未選択は候補から足す */}
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-700">特に見てほしい観点</p>
        <span className="text-xs text-gray-400">候補から選ぶ（複数可）</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="募集観点">
        {selected.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed="true"
            onClick={() => removeAspect(o.value)}
            className="inline-flex items-center gap-1 rounded-full bg-brand-400/15 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-400/25"
          >
            {o.label} <span aria-hidden="true" className="text-brand-500">✕</span>
            <span className="sr-only">を外す</span>
          </button>
        ))}
        {selected.length > 0 && candidates.length > 0 && <span className="self-center text-gray-300">｜</span>}
        {candidates.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed="false"
            onClick={() => addAspect(o.value)}
            className="rounded-full px-3 py-1 text-sm text-gray-500 ring-1 ring-black/10 transition hover:bg-white hover:text-navy-700 hover:ring-black/20"
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* AI使用状況（単一） */}
      <p className="mb-2 mt-5 text-sm font-semibold text-navy-700">この成果物の AI 使用状況</p>
      <div className="inline-flex flex-wrap gap-2" role="radiogroup" aria-label="AI使用状況">
        <RadioPill checked={!aiUsage} onClick={() => onAiUsageChange(null)}>指定しない</RadioPill>
        {AI_USAGE_OPTIONS.map((o) => (
          <span key={o.value} title={o.hint}>
            <RadioPill checked={aiUsage === o.value} onClick={() => onAiUsageChange(o.value)}>{o.label}</RadioPill>
          </span>
        ))}
      </div>
    </fieldset>
  );
}
