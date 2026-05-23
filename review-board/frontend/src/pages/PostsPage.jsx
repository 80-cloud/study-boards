import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import { RECRUIT_LABEL } from '../constants';

// F-POST-03 一覧 ＋ F-SEARCH-01 検索 ＋ F-FILTER-01 絞り込み/並び替え。
export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 検索・絞り込み・並び替えの状態。q は入力中の値、applied で確定値を持つ（Enter/ボタンで反映）。
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState({ q: '', status: '', unreviewed: false, sort: 'newest' });

  useEffect(() => {
    setLoading(true);
    fetchPosts(applied)
      .then((slice) => setPosts(slice.content ?? []))
      .catch(() => setError('投稿の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [applied]);

  const submitSearch = (e) => {
    e.preventDefault();
    setApplied((p) => ({ ...p, q }));
  };

  const setFilter = (patch) => setApplied((p) => ({ ...p, ...patch }));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">成果物（同じ期のメンバー）</h2>
        <Link to="/posts/new" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          新規投稿
        </Link>
      </div>

      {/* F-SEARCH-01 キーワード検索 */}
      <form onSubmit={submitSearch} className="mb-3 flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="タイトル・説明で検索"
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" className="rounded bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          検索
        </button>
      </form>

      {/* F-FILTER-01 絞り込み・並び替え */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <select
          value={applied.status}
          onChange={(e) => setFilter({ status: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1"
        >
          <option value="">すべての状態</option>
          <option value="OPEN">レビュー募集中</option>
          <option value="CLOSED">募集終了</option>
        </select>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={applied.unreviewed}
            onChange={(e) => setFilter({ unreviewed: e.target.checked })}
          />
          未レビューのみ
        </label>
        <select
          value={applied.sort}
          onChange={(e) => setFilter({ sort: e.target.value })}
          className="ml-auto rounded border border-gray-300 px-2 py-1"
        >
          <option value="newest">新着順</option>
          <option value="reviews">レビュー数順</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">該当する投稿がありません。</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300">
              <Link to={`/posts/${p.id}`} className="block">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">{p.title}</h3>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    {RECRUIT_LABEL[p.recruitStatus] ?? p.recruitStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">レビュー {p.reviewCount} 件</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
