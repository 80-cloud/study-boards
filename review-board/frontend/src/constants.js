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
