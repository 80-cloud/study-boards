import { useEffect, useState } from 'react';
import { AXES } from '../constants';
import { createReview } from '../api/reviews';
import { useDraft } from '../hooks/useDraft';
import DraftNotice from './DraftNotice';
import { getErrorMessage } from '../lib/errorMessages';

// F-REV-01：良かった点・改善提案は必須、観点別コメント（4軸）は任意。
// F-DRAFT-01：入力を localStorage に自動保存（postId 単位）し、再訪時に復元する。
export default function ReviewForm({ postId, onCreated }) {
  const [good, setGood] = useState('');
  const [improvement, setImprovement] = useState('');
  const [axis, setAxis] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 下書き：postId 単位で分離（投稿ごとにレビュー下書きを保持）。
  const { restored, save, clear } = useDraft(`review-${postId}`, (d) => {
    if (d.good != null) setGood(d.good);
    if (d.improvement != null) setImprovement(d.improvement);
    if (d.axis) setAxis(d.axis);
  });
  const dirty = !!(good || improvement || Object.values(axis).some((v) => v?.trim()));
  useEffect(() => { if (dirty) save({ good, improvement, axis }); }, [good, improvement, axis, dirty, save]);

  const discardDraft = () => {
    clear();
    setGood('');
    setImprovement('');
    setAxis({});
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const axisComments = AXES.filter((a) => axis[a.key]?.trim()).map((a) => ({
      axis: a.key,
      comment: axis[a.key].trim(),
    }));
    try {
      const created = await createReview(postId, { good, improvement, axisComments });
      setGood('');
      setImprovement('');
      setAxis({});
      clear(); // 投稿成功で下書きは不要
      onCreated?.(created);
    } catch (err) {
      const s = err.response?.status;
      if (s === 400) setError('自分の投稿にはレビューできません');
      else if (s === 404) setError('この投稿にはレビューできません');
      else setError(getErrorMessage(err, 'レビューを送信できませんでした。少し待ってからもう一度お試しください'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mac-card p-5">
      <h3 className="mac-h mb-3 text-base">レビューを書く <span className="text-xs font-normal text-gray-400">（マークダウン記法が使えます）</span></h3>
      {restored && <DraftNotice onDiscard={discardDraft} />}
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <label htmlFor="review-good" className="mac-label">✅ 良かった点（必須）</label>
      <textarea
        id="review-good"
        required
        value={good}
        onChange={(e) => setGood(e.target.value)}
        className="mac-input mb-3"
        rows={2}
      />
      <label htmlFor="review-improvement" className="mac-label">💡 もっと良くなる点（必須）</label>
      <textarea
        id="review-improvement"
        required
        value={improvement}
        onChange={(e) => setImprovement(e.target.value)}
        className="mac-input mb-3"
        rows={2}
      />
      <p className="mb-2 text-xs text-gray-400">観点別コメント（任意・埋めたい軸だけでOK）</p>
      {AXES.map((a) => (
        <div key={a.key} className="mb-2">
          <label htmlFor={`axis-${a.key}`} className="mb-1 block text-xs text-gray-500">{a.label}</label>
          <input
            id={`axis-${a.key}`}
            value={axis[a.key] ?? ''}
            onChange={(e) => setAxis((prev) => ({ ...prev, [a.key]: e.target.value }))}
            className="mac-input py-1.5"
          />
        </div>
      ))}
      <button type="submit" disabled={submitting} className="mac-btn-brand mt-2">
        {submitting ? '送信中…' : 'レビューを投稿'}
      </button>
    </form>
  );
}
