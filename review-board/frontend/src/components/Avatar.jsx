// プロフィールアバター。画像があれば丸く表示、無ければ頭文字のプレースホルダ。
// url は短命の署名付き URL（SEC-8）。サイズは Tailwind クラスで指定。
const SIZES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

export default function Avatar({ url, name = '', size = 'md', className = '' }) {
  const dim = SIZES[size] ?? SIZES.md;
  const initial = name.trim().charAt(0) || '?';
  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name} のアバター` : 'アバター'}
        className={`${dim} flex-shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${dim} flex flex-shrink-0 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-500 ${className}`}
    >
      {initial}
    </span>
  );
}
