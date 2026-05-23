// F-SAFE-01 / F-REQ-01：トーン区分・募集観点の表示ラベルと選択肢を一元管理する。
// backend の enum 名（ReviewTone / ReviewAspect）と一致させること。

// 希望トーン（単一選択。未設定は null）
export const TONE_OPTIONS = [
  { value: 'WELCOME_BEGINNER', label: '初学者歓迎', hint: '基礎的な指摘も歓迎' },
  { value: 'HARSH_OK', label: '辛口OK', hint: '厳しめの指摘を歓迎' },
  { value: 'GENTLE', label: '優しめ希望', hint: '言葉選びに配慮してほしい' },
];

export const TONE_LABEL = Object.fromEntries(TONE_OPTIONS.map((o) => [o.value, o.label]));

// 募集観点（多値）
export const ASPECT_OPTIONS = [
  { value: 'DB', label: 'DB' },
  { value: 'UI', label: 'UI' },
  { value: 'CODE', label: 'コード' },
  { value: 'SECURITY', label: 'セキュリティ' },
  { value: 'PERFORMANCE', label: 'パフォーマンス' },
];

export const ASPECT_LABEL = Object.fromEntries(ASPECT_OPTIONS.map((o) => [o.value, o.label]));
