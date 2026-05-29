// #492 P6：エラーメッセージの一元辞書。
// 学習者を傷つけない＆次の行動を含む日本語を返す。
// バックエンドの message が日本語で来ていればそれを優先（具体的でユーザに親切）。

const STATUS_MESSAGES = {
  400: 'リクエストの内容に問題があります。入力をご確認ください',
  401: 'ログインが必要です。もう一度ログインしてください',
  403: 'この操作を行う権限がありません',
  404: '見つかりませんでした。URL をご確認ください',
  409: '他の人が同時に編集しているようです。ページを更新してやり直してください',
  413: 'ファイルが大きすぎます（5MB まで）',
  415: '対応していないファイル形式です（PNG / JPEG / WebP のみ）',
  422: '入力内容に誤りがあります。各項目をご確認ください',
  429: '短時間に何度もアクセスがありました。1 分ほど待ってからお試しください',
  500: 'サーバーで問題が発生しました。少し待ってからもう一度お試しください',
  502: 'サーバーに繋がりませんでした。少し待ってからもう一度お試しください',
  503: 'サーバーが混み合っています。少し待ってからもう一度お試しください',
  504: 'サーバーの応答が遅れています。少し待ってからもう一度お試しください',
};

const NETWORK_MESSAGE = 'インターネット接続を確認してください';
const FALLBACK_MESSAGE = 'うまく送信できませんでした。少し待ってからもう一度お試しください';

// axios error / fetch error / 文字列 / null のいずれを受けても安全に文字列を返す。
// 第 2 引数 fallback で「この操作固有の文言」を指定可能（例: '投稿の取得に失敗しました'）。
export function getErrorMessage(error, fallback = FALLBACK_MESSAGE) {
  if (!error) return fallback;
  // axios タイムアウト / ネットワーク到達不能
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
    return NETWORK_MESSAGE;
  }
  // バックエンドの日本語メッセージを最優先（GlobalExceptionHandler が message を返す）
  const backendMessage = error.response?.data?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage.trim();
  }
  const status = error.response?.status;
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  return fallback;
}

// テスト用に辞書もエクスポート
export { STATUS_MESSAGES, NETWORK_MESSAGE, FALLBACK_MESSAGE };
