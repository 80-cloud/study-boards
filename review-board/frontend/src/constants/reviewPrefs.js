// F-SAFE-01 / F-REQ-01：トーン区分・募集観点の表示ラベルと選択肢を一元管理する。
// backend の enum 名（ReviewTone / ReviewAspect）と一致させること。

// 希望トーン（単一選択。未設定は null）
export const TONE_OPTIONS = [
  { value: 'WELCOME_BEGINNER', label: '初学者歓迎', hint: '基礎的な指摘も歓迎' },
  { value: 'HARSH_OK', label: '辛口OK', hint: '厳しめの指摘を歓迎' },
  { value: 'GENTLE', label: '優しめ希望', hint: '言葉選びに配慮してほしい' },
  { value: 'DETAILED', label: 'じっくり詳しく', hint: '時間をかけて深く見てほしい' },
  { value: 'QUICK_OK', label: 'ざっくりでOK', hint: '要点だけ手早く見てほしい' },
];

export const TONE_LABEL = Object.fromEntries(TONE_OPTIONS.map((o) => [o.value, o.label]));

// 募集観点（多値）
export const ASPECT_OPTIONS = [
  { value: 'DB', label: 'DB' },
  { value: 'UI', label: 'UI' },
  { value: 'UX', label: 'UX' },
  { value: 'CODE', label: 'コード' },
  { value: 'ARCHITECTURE', label: '設計' },
  { value: 'TESTING', label: 'テスト' },
  { value: 'SECURITY', label: 'セキュリティ' },
  { value: 'PERFORMANCE', label: 'パフォーマンス' },
  { value: 'ACCESSIBILITY', label: 'アクセシビリティ' },
];

export const ASPECT_LABEL = Object.fromEntries(ASPECT_OPTIONS.map((o) => [o.value, o.label]));

// AI使用状況の開示タグ（単一選択。未設定は null）。backend の enum 名（AiUsage）と一致させること。
export const AI_USAGE_OPTIONS = [
  { value: 'NONE', label: 'AI不使用', hint: 'AI ツールを使わずに開発' },
  { value: 'PARTIAL', label: 'AI一部使用', hint: '一部に AI 補助を利用' },
  { value: 'USED', label: 'AI使用', hint: 'AI を活用して開発' },
];

export const AI_USAGE_LABEL = Object.fromEntries(AI_USAGE_OPTIONS.map((o) => [o.value, o.label]));

// 検索キーワードの正規化：小文字化＋ひらがな→カタカナ（「せ」で「セキュリティ」に当てるため）。
const normalize = (s) =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

// キーワードを観点/トーンに解決：ラベルまたは enum 値に部分一致したものを返す（F-SEARCH-01）。
// 例：「セキュリティ」「せ」→ ['SECURITY']、「UI」→ ['UI']、「辛口」→ tones ['HARSH_OK']。
const matchByLabel = (options, keyword) => {
  const k = normalize(keyword);
  if (!k) return [];
  return options
    .filter((o) => normalize(o.label).includes(k) || o.value.toLowerCase().includes(k))
    .map((o) => o.value);
};
export const matchAspects = (keyword) => matchByLabel(ASPECT_OPTIONS, keyword);
export const matchTones = (keyword) => matchByLabel(TONE_OPTIONS, keyword);
