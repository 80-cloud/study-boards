import client from './client';

// 招待コード管理（講師/管理者・Issue #165）。
// 発行レスポンスにだけ rawCode が入る（再表示不可）。一覧では rawCode は null。
export const createInvite = (payload = {}) =>
  client.post('/invites', payload).then((r) => r.data);

export const fetchInvites = () => client.get('/invites').then((r) => r.data);

export const revokeInvite = (id) => client.delete(`/invites/${id}`);
