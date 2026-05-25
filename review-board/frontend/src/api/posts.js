import client from './client';

// F-POST-03 一覧 ＋ F-SEARCH-01 検索 ＋ F-FILTER-01 絞り込み/並び替え。
// opts: { q, aspects[], tones[], status, unreviewed, approved, sort }（すべて任意）。Spring の Slice 形（content[]）を返す。
export const fetchPosts = (opts = {}, page = 0, size = 20) => {
  const params = { page, size };
  if (opts.q) params.q = opts.q;
  // 観点・トーンはキーワードから解決した enum 配列。Spring の List<Enum> はカンマ区切りで束ねる。
  if (opts.aspects?.length) params.aspects = opts.aspects.join(',');
  if (opts.tones?.length) params.tones = opts.tones.join(',');
  if (opts.status) params.status = opts.status;
  if (opts.unreviewed) params.unreviewed = true;
  // #210：合格バッジ一覧（最新評価が合格の投稿のみ）。
  if (opts.approved) params.approved = true;
  if (opts.sort) params.sort = opts.sort;
  return client.get('/posts', { params }).then((r) => r.data);
};

// F-POST-03 単体取得
export const fetchPost = (id) => client.get(`/posts/${id}`).then((r) => r.data);

// F-POST-01 作成（タイトル/説明は必須、URL は任意）
export const createPost = (data) => client.post('/posts', data).then((r) => r.data);

// F-POST-02 編集（所有者のみ・backend が非所有者を 404）
export const updatePost = (id, data) => client.put(`/posts/${id}`, data).then((r) => r.data);

// F-POST-02 論理削除（所有者のみ）
export const deletePost = (id) => client.delete(`/posts/${id}`);

// F-REV-05 ベストレビュー選択（投稿者のみ・backend が非所有者を 404）
export const selectBestReview = (postId, reviewId) =>
  client.put(`/posts/${postId}/best-review`, { reviewId }).then((r) => r.data);

// いいね（👍）。{likeCount, liked} を返す。
export const likePost = (id) => client.post(`/posts/${id}/like`).then((r) => r.data);
export const unlikePost = (id) => client.delete(`/posts/${id}/like`).then((r) => r.data);
