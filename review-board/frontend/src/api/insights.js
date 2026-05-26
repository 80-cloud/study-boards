import client from './client';

// エンゲージメント計測（#273/#275・運営限定）。講師/管理者のみ 200、受講生は 403。
export const getEngagement = (days) =>
  client.get('/insights/engagement', { params: days ? { days } : {} }).then((r) => r.data);

export const getEngagementTrend = (weeks = 8) =>
  client.get('/insights/engagement/trend', { params: { weeks } }).then((r) => r.data);
