import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DolphinIcon from '../components/DolphinIcon';

// F-AUTH-02 招待コードによる受講生の自己登録（公開・Issue #165）。
// 講師が配布した URL（/register?code=...）から開くとコードが自動入力される。
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [displayName, setDisplayName] = useState('');
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
      await register({ code: code.trim(), email, displayName, password });
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      setError(msg || '登録に失敗しました。招待コードや入力内容をご確認ください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e8f3ff] shadow-mac ring-1 ring-black/5">
            <DolphinIcon className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-700">アカウント登録</h1>
          <p className="mt-1 text-sm text-gray-500">招待コードで受講生として参加します</p>
        </div>

        <form onSubmit={onSubmit} className="mac-card p-7">
          {error && (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <label htmlFor="reg-code" className="mac-label">招待コード</label>
          <input id="reg-code" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="講師から受け取ったコード" className="mac-input mb-4" />

          <label htmlFor="reg-name" className="mac-label">表示名</label>
          <input id="reg-name" required maxLength={50} value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} placeholder="山田 太郎" className="mac-input mb-4" />

          <label htmlFor="reg-email" className="mac-label">メールアドレス</label>
          <input id="reg-email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mac-input mb-4" />

          <label htmlFor="reg-password" className="mac-label">パスワード（8文字以上）</label>
          <div className="relative mb-6">
            <input id="reg-password" type={showPassword ? 'text' : 'password'} required minLength={8}
              autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="mac-input pr-12" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'} aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-black/[0.05] hover:text-navy-700">
              {showPassword ? '非表示' : '表示'}
            </button>
          </div>

          <button type="submit" disabled={submitting} className="mac-btn-navy w-full py-2.5">
            {submitting ? '登録中…' : '登録して始める'}
          </button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
            登録すると <Link to="/terms" className="underline hover:text-navy-700">利用規約</Link> と{' '}
            <Link to="/privacy" className="underline hover:text-navy-700">プライバシーポリシー</Link> に同意したものとみなされます。
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          すでにアカウントをお持ちの方は <Link to="/login" className="font-semibold text-navy-700 hover:underline">ログイン</Link>
        </p>
      </div>
    </main>
  );
}
