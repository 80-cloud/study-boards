import client from './client';

// F-REV-01/02 一覧（reviewer の role 付き）
export const fetchReviews = (postId) =>
  client.get(`/posts/${postId}/reviews`).then((r) => r.data);

// F-REV-01 作成（good/improvement 必須、axisComments 任意）
export const createReview = (postId, body) =>
  client.post(`/posts/${postId}/reviews`, body).then((r) => r.data);

// F-REV-03 ありがとう（投稿者のみ・冪等）
export const sendThanks = (reviewId) => client.post(`/reviews/${reviewId}/thanks`);
