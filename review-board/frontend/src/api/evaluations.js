import client from './client';

// F-EVAL-01 最新評価の取得。未評価は backend が 404 → null に倒す。
export const fetchEvaluation = (postId) =>
  client
    .get(`/posts/${postId}/evaluation`)
    .then((r) => r.data)
    .catch((e) => {
      if (e.response?.status === 404) return null;
      throw e;
    });

// F-EVAL-01 評価する（講師ロールのみ。受講生は backend が 403）
export const evaluate = (postId, body) =>
  client.post(`/posts/${postId}/evaluation`, body).then((r) => r.data);
