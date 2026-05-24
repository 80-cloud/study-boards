import client from './client';

// トップページ（案L ランディング）の統計＋実績ユーザ（同 cohort 内の実データ）。
export const fetchLandingStats = () => client.get('/stats/landing').then((r) => r.data);
