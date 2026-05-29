import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/posts';
import ScreenshotUploader from '../components/ScreenshotUploader';
import ReviewPrefFields from '../components/ReviewPrefFields';
import DraftNotice from '../components/DraftNotice';
import { useDraft } from '../hooks/useDraft';
import { getErrorMessage } from '../lib/errorMessages';

const EMPTY = { title: '', description: '', repoUrl: '', demoUrl: '', screenshotKey: null, reviewTones: [], reviewAspects: [], aiUsage: null };

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
    || form.screenshotKey || form.reviewTones.length || form.reviewAspects.length || form.aiUsage);
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
        reviewTones: form.reviewTones,
        reviewAspects: form.reviewAspects,
        aiUsage: form.aiUsage,
      });
      clear(); // 投稿成功で下書きは不要
      navigate(`/posts/${post.id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, '投稿できませんでした。入力内容をご確認のうえ、もう一度お試しください'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <p className="mac-eyebrow text-left">CREATE</p>
      <h2 className="mac-h mb-5 text-2xl">成果物を投稿</h2>
      <form onSubmit={submit} className="mac-card p-6 sm:p-7">
        {restored && <DraftNotice onDiscard={discardDraft} />}
        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label htmlFor="post-title" className="mac-label">タイトル（必須）</label>
        <input id="post-title" required value={form.title} onChange={set('title')} className="mac-input mb-4" />
        <label htmlFor="post-description" className="mac-label">説明（必須）<span className="ml-1 text-xs text-gray-400">・マークダウン可</span></label>
        <textarea id="post-description" required value={form.description} onChange={set('description')} rows={4} className="mac-input mb-4" />
        <label htmlFor="post-repo-url" className="mac-label">リポジトリ URL（任意）</label>
        <input id="post-repo-url" type="url" value={form.repoUrl} onChange={set('repoUrl')} className="mac-input mb-4" />
        <label htmlFor="post-demo-url" className="mac-label">デモ URL（任意）</label>
        <input id="post-demo-url" type="url" value={form.demoUrl} onChange={set('demoUrl')} className="mac-input mb-4" />
        <ScreenshotUploader onChange={(key) => setForm((p) => ({ ...p, screenshotKey: key }))} />
        <ReviewPrefFields
          tones={form.reviewTones}
          aspects={form.reviewAspects}
          aiUsage={form.aiUsage}
          onTonesChange={(v) => setForm((p) => ({ ...p, reviewTones: v }))}
          onAspectsChange={(v) => setForm((p) => ({ ...p, reviewAspects: v }))}
          onAiUsageChange={(v) => setForm((p) => ({ ...p, aiUsage: v }))}
        />
        <button type="submit" disabled={busy} className="mac-btn-brand">
          {busy ? '投稿中…' : '投稿する'}
        </button>
      </form>
    </main>
  );
}
