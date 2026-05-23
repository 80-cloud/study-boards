import client from './client';

// F-PROF 成長記録（同 cohort のみ閲覧可）
export const fetchProfile = (userId) =>
  client.get(`/users/${userId}/profile`).then((r) => r.data);

// F-PROF（S-04）プロフィール編集（本人のみ・bio＋avatarKey・backend が principal で本人限定）
export const updateMyProfile = (data) =>
  client.put('/users/me/profile', data).then((r) => r.data);
