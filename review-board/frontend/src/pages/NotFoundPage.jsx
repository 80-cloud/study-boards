import { Link } from 'react-router-dom';
import DolphinIcon from '../components/DolphinIcon';
import { APP_NAME } from '../constants';

// SPA の存在しないパスに到達したときの 404 ページ。
// App.jsx の path="*" route で割り当て、ブラウザ既定の白画面を防ぐ。
export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#e8f3ff] shadow-mac ring-1 ring-black/5">
          <DolphinIcon className="h-14 w-14" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">404</p>
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-navy-700">
          ページが見つかりませんでした
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          お探しのページは移動または削除された可能性があります。
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-mac-sm transition hover:bg-navy-700/90"
        >
          {APP_NAME} のトップへ
        </Link>
      </div>
    </main>
  );
}
