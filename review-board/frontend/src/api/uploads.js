import client from './client';

// SEC-8：スクショのアップロード。multipart で送り {key, url} を受け取る。
// 検証（magic byte・サイズ・private 隔離）は backend が担う。返った key を投稿に付与する。
// #500 P8：onProgress(percent, loaded, total) を渡すと進捗を通知する。
export const uploadScreenshot = (file, onProgress) => {
  const data = new FormData();
  data.append('file', file);
  return client.post('/uploads/screenshot', data, {
    onUploadProgress: onProgress ? (e) => {
      if (e.total) onProgress(Math.round((e.loaded * 100) / e.total), e.loaded, e.total);
      else onProgress(null, e.loaded, e.total);
    } : undefined,
  }).then((r) => r.data);
};
