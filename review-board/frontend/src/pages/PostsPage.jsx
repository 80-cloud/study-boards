import { useEffect, useState } from 'react';
import { fetchPosts } from '../api/posts';

const STATUS_LABEL = { OPEN: 'レビュー募集中', CLOSED: '募集終了' };

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts()
      .then((slice) => setPosts(slice.content ?? []))
      .catch(() => setError('投稿の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-gray-500">読み込み中…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-800">成果物（同じ期のメンバー）</h2>
      {posts.length === 0 ? (
        <p className="text-gray-500">まだ投稿がありません。</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">{p.title}</h3>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                  {STATUS_LABEL[p.recruitStatus] ?? p.recruitStatus}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">レビュー {p.reviewCount} 件</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
