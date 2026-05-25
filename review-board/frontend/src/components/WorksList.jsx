import { Link } from 'react-router-dom';
import ReviewPrefBadges from './ReviewPrefBadges';
import Avatar from './Avatar';

// スクショ未登録カードのサムネ：id から決め打ちのグラデーション（装飾プレースホルダ）。
// 実スクショ（post.screenshotUrl）がある投稿はそちらを優先表示する。
const GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-indigo-400 to-blue-700',
];
const gradientOf = (id) => GRADIENTS[id % GRADIENTS.length];

// 成果物一覧（検索結果の絞り込み/並び替え＋カードグリッド）。
// ランディング（PostsPage の WORKS セクション）と専用ページ（WorksPage）の双方で再利用する。
// 状態と取得は呼び出し側が持ち、本コンポーネントは表示と操作の橋渡し（applied/setFilter）に専念する。
export default function WorksList({ posts, loading, error, applied, setFilter, onClearQuery }) {
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <select value={applied.status} onChange={(e) => setFilter({ status: e.target.value })}
          aria-label="募集状態で絞り込み"
          className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none">
          <option value="">すべての状態</option>
          <option value="OPEN">レビュー募集中</option>
          <option value="CLOSED">募集終了</option>
        </select>
        <label className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={applied.unreviewed} onChange={(e) => setFilter({ unreviewed: e.target.checked })} />
          未レビューのみ
        </label>
        <select value={applied.sort} onChange={(e) => setFilter({ sort: e.target.value })}
          aria-label="並び替え"
          className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none">
          <option value="newest">新着順</option>
          <option value="reviews">レビュー数順</option>
          <option value="likes">いいね順</option>
        </select>
        {applied.q && (
          <span className="rounded-full bg-brand-400/15 px-3 py-1 text-xs font-medium text-brand-600">
            「{applied.q}」で絞り込み中
            <button onClick={onClearQuery} className="ml-1.5 font-bold" aria-label="キーワードの絞り込みを解除">×</button>
          </span>
        )}
        {/* #210 合格バッジ・タイルからの絞り込み中であることを明示し、解除できるようにする。 */}
        {applied.approved && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            🏅 合格作品のみ
            <button onClick={() => setFilter({ approved: false })} className="ml-1.5 font-bold" aria-label="合格作品の絞り込みを解除">×</button>
          </span>
        )}
        {/* 「＋ 投稿する」は WR Blue Pearl（mac-btn-brand は他ボタンと共有のため使わず個別指定）。 */}
        <Link to="/posts/new"
          className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-wrblue-500 px-4 py-2.5 text-sm font-bold text-white shadow-mac-sm transition hover:bg-wrblue-600 active:scale-[0.98]">
          ＋ 投稿する
        </Link>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="py-16 text-center text-gray-400">読み込み中…</p>
        ) : error ? (
          <p className="py-16 text-center text-red-500">{error}</p>
        ) : posts.length === 0 ? (
          <p className="py-16 text-center text-gray-400">該当する成果物がありません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} to={`/posts/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-mac-sm transition hover:-translate-y-1 hover:shadow-mac">
                {/* サムネ：スクショがあれば実画像（ブラウザ枠風）、無ければグラデのプレースホルダ。 */}
                <div className="relative h-36 overflow-hidden bg-gray-50">
                  {p.screenshotUrl ? (
                    <>
                      <div className="flex h-7 items-center gap-1.5 border-b border-black/5 bg-white px-3">
                        <span className="h-2 w-2 rounded-full bg-red-400" />
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                      </div>
                      <img src={p.screenshotUrl} alt="" className="h-[calc(9rem-1.75rem)] w-full object-cover" />
                    </>
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientOf(p.id)}`}>
                      <span aria-hidden="true" className="text-4xl font-black text-white/95 drop-shadow-sm">
                        {p.title?.trim()?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  {p.recruitStatus === 'OPEN'
                    ? <span className="absolute right-3 top-9 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">募集中</span>
                    : <span className="absolute right-3 top-9 rounded-full bg-gray-700/80 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">締切</span>}
                </div>
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug text-navy-700">{p.title}</h3>
                  <div className="mb-3 flex items-center gap-2">
                    <Avatar name={p.authorDisplayName ?? ''} size="sm" />
                    <span className="truncate text-xs text-gray-500">{p.authorDisplayName ?? '—'}</span>
                  </div>
                  <div className="mb-3"><ReviewPrefBadges tones={p.reviewTones} aspects={p.reviewAspects} aiUsage={p.aiUsage} /></div>
                  <div className="flex items-center justify-between border-t border-black/5 pt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-3">
                      <span>👍 {p.likeCount}</span>
                      <span>💬 {p.reviewCount}</span>
                    </span>
                    <span className="font-semibold text-brand-500 group-hover:underline">見る ›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
