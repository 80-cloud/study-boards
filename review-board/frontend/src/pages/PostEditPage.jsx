import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPost, updatePost } from '../api/posts';
import ScreenshotUploader from '../components/ScreenshotUploader';
import ReviewPrefFields from '../components/ReviewPrefFields';
import { getErrorMessage } from '../lib/errorMessages';

// F-POST-02 投稿の編集（所有者のみ。非所有者は backend が 404）。
export default function PostEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPost(id)
      .then((p) => {
        setForm({
          title: p.title,
          description: p.description,
          repoUrl: p.repoUrl ?? '',
          demoUrl: p.demoUrl ?? '',
          // 未変更なら既存 key を維持。差し替え時に Uploader が新 key を入れる。
          screenshotKey: p.screenshotKey ?? null,
          reviewTones: p.reviewTones ?? [],
          reviewAspects: p.reviewAspects ?? [],
          aiUsage: p.aiUsage ?? null,
        });
        setScreenshotUrl(p.screenshotUrl ?? '');
      })
      .catch((e) => setError(e.response?.status === 404
        ? 'この投稿は編集できません'
        : getErrorMessage(e, '投稿を読み込めませんでした。少し待ってからもう一度お試しください')));
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
        screenshotKey: form.screenshotKey || null,
        reviewTones: form.reviewTones,
        reviewAspects: form.reviewAspects,
        aiUsage: form.aiUsage,
      });
      navigate(`/posts/${id}`, { replace: true });
    } catch (err) {
      setError(err.response?.status === 404
        ? 'この投稿を編集する権限がありません'
        : getErrorMessage(err, '更新できませんでした。入力内容をご確認のうえ、もう一度お試しください'));
    } finally {
      setBusy(false);
    }
  };

  if (error && !form) return <p className="p-6 text-red-600">{error}</p>;
  if (!form) return <p className="p-6 text-gray-500">読み込み中…</p>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <p className="mac-eyebrow text-left">EDIT</p>
      <h2 className="mac-h mb-5 text-2xl">投稿を編集</h2>
      <form onSubmit={submit} className="mac-card p-6 sm:p-7">
        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label htmlFor="edit-title" className="mac-label">タイトル（必須）</label>
        <input id="edit-title" required value={form.title} onChange={set('title')} className="mac-input mb-4" />
        <label htmlFor="edit-description" className="mac-label">説明（必須）</label>
        <textarea id="edit-description" required value={form.description} onChange={set('description')} rows={4} className="mac-input mb-4" />
        <label htmlFor="edit-repo-url" className="mac-label">リポジトリ URL（任意）</label>
        <input id="edit-repo-url" type="url" value={form.repoUrl} onChange={set('repoUrl')} className="mac-input mb-4" />
        <label htmlFor="edit-demo-url" className="mac-label">デモ URL（任意）</label>
        <input id="edit-demo-url" type="url" value={form.demoUrl} onChange={set('demoUrl')} className="mac-input mb-4" />
        <ScreenshotUploader initialUrl={screenshotUrl} onChange={(key) => setForm((p) => ({ ...p, screenshotKey: key }))} />
        <ReviewPrefFields
          tones={form.reviewTones}
          aspects={form.reviewAspects}
          aiUsage={form.aiUsage}
          onTonesChange={(v) => setForm((p) => ({ ...p, reviewTones: v }))}
          onAspectsChange={(v) => setForm((p) => ({ ...p, reviewAspects: v }))}
          onAiUsageChange={(v) => setForm((p) => ({ ...p, aiUsage: v }))}
        />
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="mac-btn-brand">
            {busy ? '更新中…' : '更新する'}
          </button>
          <button type="button" onClick={() => navigate(`/posts/${id}`)} className="mac-btn-ghost">
            キャンセル
          </button>
        </div>
      </form>
    </main>
  );
}
