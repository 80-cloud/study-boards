import client from './client';

// F-REV-01/02 一覧（reviewer の role 付き）
export const fetchReviews = (postId) =>
  client.get(`/posts/${postId}/reviews`).then((r) => r.data);

// F-REV-01 作成（good/improvement 必須、axisComments 任意）
export const createReview = (postId, body) =>
  client.post(`/posts/${postId}/reviews`, body).then((r) => r.data);

// F-REV 編集（所有者のみ・backend が非所有者を 404）
export const updateReview = (reviewId, body) =>
  client.put(`/reviews/${reviewId}`, body).then((r) => r.data);

// F-REV 論理削除（所有者のみ）
export const deleteReview = (reviewId) => client.delete(`/reviews/${reviewId}`);

// F-REV-03 ありがとう（投稿者のみ・冪等）
export const sendThanks = (reviewId) => client.post(`/reviews/${reviewId}/thanks`);

// F-REV-04 返信スレッド（同 cohort）
export const fetchReplies = (reviewId) =>
  client.get(`/reviews/${reviewId}/replies`).then((r) => r.data);
export const createReply = (reviewId, body) =>
  client.post(`/reviews/${reviewId}/replies`, { body }).then((r) => r.data);
export const deleteReply = (replyId) => client.delete(`/replies/${replyId}`);
