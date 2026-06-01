import axios from 'axios';

// 認証は HttpOnly Cookie（共通設計方針）。トークンを JS で保持しないため withCredentials のみで成立。
const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// 401 のときは access の期限切れを想定し refresh→再試行を一度だけ行う（SEC-7：一元化）。
let refreshing = null;

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (response?.status === 401 && !config._retried && !config.url?.includes('/auth/')) {
      config._retried = true;
      try {
        refreshing = refreshing || client.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return client(config);
      } catch (e) {
        refreshing = null;
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

export default client;
