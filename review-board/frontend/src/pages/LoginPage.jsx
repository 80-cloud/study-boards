import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DolphinIcon from '../components/DolphinIcon';
import { APP_NAME, APP_TAGLINE } from '../constants';
import { getErrorMessage } from '../lib/errorMessages';

export default function LoginPage() {
  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // C-6（#235）MFA 2段目：パスワード成功後に TOTP を要求する状態。
  const [mfaStep, setMfaStep] = useState(false);
  const [code, setCode] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result?.mfaRequired) {
        setMfaStep(true); // TOTP 入力へ
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      // 認証失敗は存在を漏らさない汎用メッセージ（backend が 401 を返す）
      setError(err.response?.status === 401
        ? 'メールアドレスまたはパスワードが違います'
        : getErrorMessage(err, '通信に失敗しました。少し待ってからもう一度お試しください'));
    } finally {
      setSubmitting(false);
    }
  };

  // 「デモで試す」ボタン：触って 30 秒で動かすために demo シードアカウントで即ログインする。
  // dev seed の SEED_PASSWORD と同一のパスワードを使う（README に同期掲載）。
  const onSubmitDemo = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await login('demo@example.com', 'devpass12345');
      if (result?.mfaRequired) {
        setMfaStep(true);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'デモアカウントが利用できません（dev シード未投入の可能性）'
          : getErrorMessage(err, '通信に失敗しました。少し待ってからもう一度お試しください')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitMfa = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await completeMfaLogin(code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.status === 401
        ? '認証コードが正しくありません'
        : getErrorMessage(err, '通信に失敗しました。少し待ってからもう一度お試しください'));
    } finally {
      setSubmitting(false);
    }
  };

  if (mfaStep) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e8f3ff] shadow-mac ring-1 ring-black/5">
              <DolphinIcon className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-700">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-gray-500">二要素認証</p>
          </div>
          <form onSubmit={onSubmitMfa} className="mac-card p-7">
            {error && (
              <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}
            <label className="mac-label" htmlFor="code">認証アプリの6桁コード</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mac-input mb-6 text-center text-lg tracking-[0.4em]"
            />
            <button type="submit" disabled={submitting} className="mac-btn-navy w-full py-2.5">
              {submitting ? '確認中…' : 'ログイン'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ブランド */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e8f3ff] shadow-mac ring-1 ring-black/5">
            <DolphinIcon className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-700">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-gray-500">{APP_TAGLINE}</p>
        </div>

        {/* ログインカード */}
        <form onSubmit={onSubmit} className="mac-card p-7">
          {error && (
            <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <label className="mac-label" htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mac-input mb-4"
          />

          <label className="mac-label" htmlFor="password">パスワード</label>
          <div className="relative mb-6">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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

          <button type="submit" disabled={submitting} className="mac-btn-navy w-full py-2.5">
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>

          <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
            <span className="h-px flex-1 bg-gray-200" />
            <span>または</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={onSubmitDemo}
            disabled={submitting}
            data-testid="demo-login-button"
            className="mt-3 w-full rounded-xl border border-navy-700/15 bg-white py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-[#f4f8ff] disabled:opacity-60"
          >
            🐬 デモアカウントで試す（登録不要）
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            <Link to="/password-reset" className="font-semibold text-navy-700 hover:underline">
              パスワードをお忘れですか？
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          招待コードをお持ちの方は <Link to="/register" className="font-semibold text-navy-700 hover:underline">こちらから登録</Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400">
          <Link to="/terms" className="hover:underline">利用規約</Link>
          <span className="mx-1.5">·</span>
          <Link to="/privacy" className="hover:underline">プライバシーポリシー</Link>
          <span className="mx-1.5">·</span>
          <Link to="/help" className="hover:underline">ヘルプを見る</Link>
        </p>
      </div>
    </main>
  );
}
