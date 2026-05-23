import client from './client';

// F-NOTIF-01 通知（ポーリング・WebSocket不使用）。すべて受信者本人のもののみ。

// 通知一覧（新着順）
export const fetchNotifications = () => client.get('/notifications').then((r) => r.data);

// 未読件数（ベルのバッジ用・ポーリングで頻繁に叩く軽量 API）
export const fetchUnreadCount = () =>
  client.get('/notifications/unread-count').then((r) => r.data.count);

// 1件を既読化（自分の通知のみ・backend が他人を 404）
export const markNotificationRead = (id) => client.post(`/notifications/${id}/read`);

// 未読をすべて既読化
export const markAllNotificationsRead = () => client.post('/notifications/read-all');
