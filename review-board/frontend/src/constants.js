// アプリの表示名（ユーザーに見える名前）の単一ソース。
// ★将来の完全リネームの仕込み：表示名はここ1箇所を変えれば全フロントに反映される
//   （Header / LoginPage / RegisterPage / PostsPage / document.title が参照）。
//   パッケージ名・リポジトリ・AWS 資源などの内部識別子は別管理（docs/ADR の完全リネーム手順を参照）。
export const APP_NAME = 'レビューラボ';
export const APP_TAGLINE = '成長を支え合うレビューコミュニティ';

// 母の品質4軸に対応する観点別コメントの軸（F-REV-01）。
export const AXES = [
  { key: 'CORRECTNESS', label: '①動作・正しさ' },
  { key: 'MAINTAINABILITY', label: '②可読性・保守性' },
  { key: 'SECURITY', label: '③セキュリティ' },
  { key: 'PERFORMANCE', label: '④性能・UX' },
];

export const AXIS_LABEL = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

export const ROLE_LABEL = { STUDENT: '受講生', TEACHER: '講師' };

export const RECRUIT_LABEL = { OPEN: 'レビュー募集中', CLOSED: '募集終了' };

export const EVAL_LABEL = { APPROVED: '合格', RETURNED: '差し戻し' };

// F-GROW-01 成長ループ：レビューへの対応状態（投稿者本人が設定）。backend の GrowthStatus と一致させる。
export const GROWTH_OPTIONS = [
  { value: 'OPEN', label: '未対応', badge: 'bg-gray-100 text-gray-600 ring-gray-300' },
  { value: 'FIXED', label: '修正済み', badge: 'bg-green-100 text-green-700 ring-green-300' },
  { value: 'WONT_FIX', label: '対応不要', badge: 'bg-gray-100 text-gray-500 ring-gray-300' },
  { value: 'RE_REVIEW_REQUESTED', label: '再レビュー依頼', badge: 'bg-blue-100 text-blue-700 ring-blue-300' },
  { value: 'RESOLVED', label: '解決済み', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-300' },
];

export const GROWTH_MAP = Object.fromEntries(GROWTH_OPTIONS.map((o) => [o.value, o]));
