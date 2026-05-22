import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/posts';
import ScreenshotUploader from '../components/ScreenshotUploader';

// F-POST-01：成果物の投稿（タイトル/説明は必須、URL・スクショは任意）。
export default function NewPostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', repoUrl: '', demoUrl: '', screenshotKey: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const post = await createPost({
        title: form.title,
        description: form.description,
        repoUrl: form.repoUrl || null,
        demoUrl: form.demoUrl || null,
        screenshotKey: form.screenshotKey || null,
      });
      navigate(`/posts/${post.id}`, { replace: true });
    } catch {
      setError('投稿に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-800">成果物を投稿</h2>
      <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-6">
        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="mb-1 block text-sm text-gray-600">タイトル（必須）</label>
        <input required value={form.title} onChange={set('title')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">説明（必須）</label>
        <textarea required value={form.description} onChange={set('description')} rows={4} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">リポジトリ URL（任意）</label>
        <input type="url" value={form.repoUrl} onChange={set('repoUrl')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">デモ URL（任意）</label>
        <input type="url" value={form.demoUrl} onChange={set('demoUrl')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <ScreenshotUploader onChange={(key) => setForm((p) => ({ ...p, screenshotKey: key }))} />
        <button type="submit" disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? '投稿中…' : '投稿する'}
        </button>
      </form>
    </main>
  );
}
