import client from './client';

// F-POST-03 一覧（同 cohort・ページネーション）。Spring の Slice 形（content[]）を返す。
export const fetchPosts = (page = 0, size = 20) =>
  client.get('/posts', { params: { page, size } }).then((r) => r.data);

// F-POST-03 単体取得
export const fetchPost = (id) => client.get(`/posts/${id}`).then((r) => r.data);

// F-POST-01 作成（タイトル/説明は必須、URL は任意）
export const createPost = (data) => client.post('/posts', data).then((r) => r.data);
