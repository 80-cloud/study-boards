import { Link } from 'react-router-dom';
import { APP_NAME } from '../constants';

// 公開法務ページ（規約/プライバシー）の共通レイアウト。ログイン不要で読めるよう
// Header（認証前提）を使わず、最小のヘッダ＋戻り導線だけを置く。
export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="mac-h text-base">{APP_NAME}</Link>
          <nav className="flex gap-3 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-gray-800">利用規約</Link>
            <Link to="/privacy" className="text-gray-500 hover:text-gray-800">プライバシー</Link>
            <Link to="/help" className="text-gray-500 hover:text-gray-800">ヘルプ</Link>
            <Link to="/login" className="text-brand-600 hover:underline">ログイン</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mac-h text-2xl">{title}</h1>
        {lastUpdated && <p className="mt-1 text-xs text-gray-500">最終更新日：{lastUpdated}</p>}
        <div className="legal-body mt-6 space-y-6 text-sm leading-relaxed text-gray-700">
          {children}
        </div>
        <p className="mt-10 text-xs text-gray-400">
          本ページは学習段階のドラフトです。実運用時は法務確認のうえ確定します。
        </p>
      </main>
    </div>
  );
}

// 章見出し＋本文の小コンポーネント（規約/プライバシーで共用）。
export function Section({ heading, children }) {
  return (
    <section>
      <h2 className="mac-h text-base text-gray-900">{heading}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
