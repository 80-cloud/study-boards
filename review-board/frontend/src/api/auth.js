import client from './client';

// F-AUTH。トークンは Cookie で受け渡すため body には載らない。
export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const logout = () => client.post('/auth/logout');

export const fetchMe = () => client.get('/auth/me').then((r) => r.data);
