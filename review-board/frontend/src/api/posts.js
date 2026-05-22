import client from './client';

// F-POST-03 一覧（同 cohort・ページネーション）。Spring の Slice 形（content[]）を返す。
export const fetchPosts = (page = 0, size = 20) =>
  client.get('/posts', { params: { page, size } }).then((r) => r.data);
