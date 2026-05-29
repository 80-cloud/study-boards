import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import DolphinIcon from '../components/DolphinIcon';
import { APP_NAME } from '../constants';
import { requestPasswordReset, confirmPasswordReset } from '../api/auth';

/**
 * B-4 パスワードリセット（#231）。
 * - token クエリなし＝リクエスト画面（email を送る）。列挙防止のため常に「送信しました」を表示。
 * - token クエリあり＝確定画面（新パスワードを設定）。成功でログインへ誘導。
 */
export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e8f3ff] shadow-mac ring-1 ring-black/5">
            <DolphinIcon className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-700">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-gray-500">パスワードの再設定</p>
        </div>
        {token ? <ConfirmForm token={token} /> : <RequestForm />}
        <p className="mt-6 text-center text-xs text-gray-400">
          <Link to="/login" className="font-semibold text-navy-700 hover:underline">ログインに戻る</Link>
        </p>
      </div>
    </main>
  );
}

/** リクエスト：email を送信。存在を漏らさないため、結果に関わらず同じ確認文を出す。 */
function RequestForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // 列挙防止：失敗（4xx 含む）でも同じ確認文を出す。
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="mac-card p-7 text-sm text-gray-600">
        ご登録のメールアドレス宛に、パスワード再設定の手順をお送りしました。
        メールが届かない場合は、アドレスの誤りや迷惑メールフォルダをご確認ください。
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mac-card p-7">
      <p className="mb-4 text-sm text-gray-500">
        登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
      </p>
      <label className="mac-label" htmlFor="email">メールアドレス</label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mac-input mb-6"
      />
      <button type="submit" disabled={submitting} className="mac-btn-navy w-full py-2.5">
        {submitting ? '送信中…' : '再設定リンクを送る'}
      </button>
    </form>
  );
}

/** 確定：token + 新パスワード。成功でログインへ誘導。期限切れ/使用済みは 400 → 汎用エラー。 */
function ConfirmForm({ token }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    if (password !== confirm) {
      setError('確認用パスワードが一致しません');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(
        err.response?.status === 400
          ? 'リンクが無効か、有効期限が切れています。お手数ですが再度リクエストしてください。'
          : '通信に失敗しました',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mac-card p-7 text-sm text-gray-600">
        パスワードを再設定しました。ログイン画面に移動します…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mac-card p-7">
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      <label className="mac-label" htmlFor="password">新しいパスワード</label>
      <div className="relative mb-4">
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="new-password"
          placeholder="8文字以上"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mac-input pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
          aria-pressed={showPassword}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-black/[0.05] hover:text-navy-700"
        >
          {showPassword ? '非表示' : '表示'}
        </button>
      </div>

      <label className="mac-label" htmlFor="confirm">新しいパスワード（確認）</label>
      <input
        id="confirm"
        type={showPassword ? 'text' : 'password'}
        required
        autoComplete="new-password"
        placeholder="もう一度入力"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="mac-input mb-6"
      />

      <button type="submit" disabled={submitting} className="mac-btn-navy w-full py-2.5">
        {submitting ? '更新中…' : 'パスワードを更新'}
      </button>
    </form>
  );
}
