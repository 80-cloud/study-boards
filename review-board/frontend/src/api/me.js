import client from './client';

// 自分のデータのエクスポート（#261）。本人のプロフィール・投稿・レビューを JSON で取得。
export const exportMyData = () => client.get('/me/export').then((r) => r.data);

// 退会（#263・論理削除＋匿名化）。成功後はサーバが認証 Cookie を消す。
export const deleteMyAccount = () => client.delete('/me');
