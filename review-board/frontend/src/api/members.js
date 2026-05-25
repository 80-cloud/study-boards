import client from './client';

// メンバー管理（講師/管理者・#229）。自 cohort のメンバー一覧と無効化/有効化。
export const fetchMembers = () => client.get('/members').then((r) => r.data);

export const disableMember = (id) => client.put(`/members/${id}/disable`).then((r) => r.data);

export const enableMember = (id) => client.put(`/members/${id}/enable`).then((r) => r.data);
