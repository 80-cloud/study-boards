import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DolphinIcon from '../components/DolphinIcon';
import { APP_NAME, APP_TAGLINE } from '../constants';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // 認証失敗は存在を漏らさない汎用メッセージ（backend が 401 を返す）
      setError(err.response?.status === 401 ? 'メールアドレスまたはパスワードが違います' : '通信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-2.5 text-sm text-red-600">
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

          <p className="mt-4 text-center text-xs text-gray-400">
            <Link to="/password-reset" className="font-semibold text-navy-700 hover:underline">
              パスワードをお忘れですか？
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          招待コードをお持ちの方は <Link to="/register" className="font-semibold text-navy-700 hover:underline">こちらから登録</Link>
        </p>
      </div>
    </main>
  );
}
