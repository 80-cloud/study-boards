import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPost, updatePost } from '../api/posts';

// F-POST-02 投稿の編集（所有者のみ。非所有者は backend が 404）。
export default function PostEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPost(id)
      .then((p) => setForm({
        title: p.title,
        description: p.description,
        repoUrl: p.repoUrl ?? '',
        demoUrl: p.demoUrl ?? '',
      }))
      .catch((e) => setError(e.response?.status === 404 ? 'この投稿は編集できません' : '取得に失敗しました'));
  }, [id]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await updatePost(id, {
        title: form.title,
        description: form.description,
        repoUrl: form.repoUrl || null,
        demoUrl: form.demoUrl || null,
      });
      navigate(`/posts/${id}`, { replace: true });
    } catch (err) {
      setError(err.response?.status === 404 ? '権限がありません' : '更新に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  if (error && !form) return <p className="p-6 text-red-600">{error}</p>;
  if (!form) return <p className="p-6 text-gray-500">読み込み中…</p>;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-800">投稿を編集</h2>
      <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-6">
        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="mb-1 block text-sm text-gray-600">タイトル（必須）</label>
        <input required value={form.title} onChange={set('title')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">説明（必須）</label>
        <textarea required value={form.description} onChange={set('description')} rows={4} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">リポジトリ URL（任意）</label>
        <input type="url" value={form.repoUrl} onChange={set('repoUrl')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">デモ URL（任意）</label>
        <input type="url" value={form.demoUrl} onChange={set('demoUrl')} className="mb-6 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? '更新中…' : '更新する'}
          </button>
          <button type="button" onClick={() => navigate(`/posts/${id}`)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </form>
    </main>
  );
}
