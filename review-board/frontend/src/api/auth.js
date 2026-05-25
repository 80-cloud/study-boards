import client from './client';

// F-AUTH。トークンは Cookie で受け渡すため body には載らない。
export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

// F-AUTH-02 招待コードによる受講生の自己登録（公開）。成功時はそのままログイン状態（Cookie）になる。
export const register = (payload) =>
  client.post('/auth/register', payload).then((r) => r.data);

export const logout = () => client.post('/auth/logout');

export const fetchMe = () => client.get('/auth/me').then((r) => r.data);
