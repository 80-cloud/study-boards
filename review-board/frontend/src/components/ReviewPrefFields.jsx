import { TONE_OPTIONS, ASPECT_OPTIONS } from '../constants/reviewPrefs';

// F-SAFE-01 / F-REQ-01：投稿フォームのトーン（単一）・募集観点（多値）入力。
// props: tone(string|null), aspects(string[]), onToneChange, onAspectsChange。
export default function ReviewPrefFields({ tone, aspects = [], onToneChange, onAspectsChange }) {
  const toggleAspect = (value) => {
    onAspectsChange(aspects.includes(value) ? aspects.filter((a) => a !== value) : [...aspects, value]);
  };

  return (
    <fieldset className="mb-4 rounded border border-gray-200 p-4">
      <legend className="px-1 text-sm font-medium text-gray-700">レビューの希望（任意）</legend>

      <p className="mb-1 text-sm text-gray-600">どんなトーンが歓迎ですか？</p>
      <div className="mb-4 flex flex-wrap gap-3" role="radiogroup" aria-label="希望トーン">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
          <input type="radio" name="reviewTone" checked={!tone} onChange={() => onToneChange(null)} />
          指定しない
        </label>
        {TONE_OPTIONS.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700" title={o.hint}>
            <input type="radio" name="reviewTone" checked={tone === o.value} onChange={() => onToneChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>

      <p className="mb-1 text-sm text-gray-600">特に見てほしい観点（複数選択可）</p>
      <div className="flex flex-wrap gap-3">
        {ASPECT_OPTIONS.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={aspects.includes(o.value)} onChange={() => toggleAspect(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
