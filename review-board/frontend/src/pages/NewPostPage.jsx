import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/posts';
import ScreenshotUploader from '../components/ScreenshotUploader';
import ReviewPrefFields from '../components/ReviewPrefFields';
import DraftNotice from '../components/DraftNotice';
import { useDraft } from '../hooks/useDraft';

const EMPTY = { title: '', description: '', repoUrl: '', demoUrl: '', screenshotKey: null, reviewTone: null, reviewAspects: [], aiUsage: null };

// F-POST-01：成果物の投稿（タイトル/説明は必須、URL・スクショは任意）。
// F-DRAFT-01：入力を localStorage に自動保存し、再訪時に復元する。
export default function NewPostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 下書き：復元はマウント時に form へ流し込み、変更のたびに自動保存。
  const { restored, save, clear } = useDraft('post-new', (draft) => setForm((p) => ({ ...p, ...draft })));
  // 空フォームは保存しない（「空の下書き復元」誤検知を防ぐ）。
  const dirty = !!(form.title || form.description || form.repoUrl || form.demoUrl
    || form.screenshotKey || form.reviewTone || form.reviewAspects.length || form.aiUsage);
  useEffect(() => { if (dirty) save(form); }, [form, dirty, save]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const discardDraft = () => {
    clear();
    setForm(EMPTY);
  };

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
        reviewTone: form.reviewTone,
        reviewAspects: form.reviewAspects,
        aiUsage: form.aiUsage,
      });
      clear(); // 投稿成功で下書きは不要
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
        {restored && <DraftNotice onDiscard={discardDraft} />}
        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="mb-1 block text-sm text-gray-600">タイトル（必須）</label>
        <input required value={form.title} onChange={set('title')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">説明（必須）<span className="text-xs text-gray-400">・マークダウン可</span></label>
        <textarea required value={form.description} onChange={set('description')} rows={4} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">リポジトリ URL（任意）</label>
        <input type="url" value={form.repoUrl} onChange={set('repoUrl')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <label className="mb-1 block text-sm text-gray-600">デモ URL（任意）</label>
        <input type="url" value={form.demoUrl} onChange={set('demoUrl')} className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <ScreenshotUploader onChange={(key) => setForm((p) => ({ ...p, screenshotKey: key }))} />
        <ReviewPrefFields
          tone={form.reviewTone}
          aspects={form.reviewAspects}
          aiUsage={form.aiUsage}
          onToneChange={(v) => setForm((p) => ({ ...p, reviewTone: v }))}
          onAspectsChange={(v) => setForm((p) => ({ ...p, reviewAspects: v }))}
          onAiUsageChange={(v) => setForm((p) => ({ ...p, aiUsage: v }))}
        />
        <button type="submit" disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? '投稿中…' : '投稿する'}
        </button>
      </form>
    </main>
  );
}
