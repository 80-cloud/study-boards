import client from './client';

// 自分のデータのエクスポート（#261）。本人のプロフィール・投稿・レビューを JSON で取得。
export const exportMyData = () => client.get('/me/export').then((r) => r.data);
