import client from './client';

// C-5（#233）通知設定。常に自分の設定だけを読み書きする（backend が principal で限定）。
export const fetchNotificationPrefs = () =>
  client.get('/notification-prefs').then((r) => r.data);

export const updateNotificationPrefs = (prefs) =>
  client.put('/notification-prefs', prefs).then((r) => r.data);
