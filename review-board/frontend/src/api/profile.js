import client from './client';

// F-PROF 成長記録（同 cohort のみ閲覧可）
export const fetchProfile = (userId) =>
  client.get(`/users/${userId}/profile`).then((r) => r.data);
