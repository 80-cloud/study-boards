import client from './client';

// SEC-8：スクショのアップロード。multipart で送り {key, url} を受け取る。
// 検証（magic byte・サイズ・private 隔離）は backend が担う。返った key を投稿に付与する。
export const uploadScreenshot = (file) => {
  const data = new FormData();
  data.append('file', file);
  return client.post('/uploads/screenshot', data).then((r) => r.data);
};
