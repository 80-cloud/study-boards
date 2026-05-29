import { Link } from 'react-router-dom';

// リスト系ページが空のときに「未完成感」を出さないための共通コンポーネント。
// 文字 1 行だけの empty 表示を、アイコン＋見出し＋説明＋次アクションの導線に置き換える。
export default function EmptyState({
  icon = '📭',
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">
        {icon}
      </div>
      <h2 className="mb-2 text-lg font-semibold text-gray-700">{title}</h2>
      {description && <p className="mb-5 text-sm text-gray-500">{description}</p>}
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-mac-sm transition hover:bg-navy-700/90"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && !ctaHref && ctaOnClick && (
        <button
          type="button"
          onClick={ctaOnClick}
          className="rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-mac-sm transition hover:bg-navy-700/90"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
