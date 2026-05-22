import { useState } from 'react';
import { AXES } from '../constants';
import { createReview } from '../api/reviews';

// F-REV-01：良かった点・改善提案は必須、観点別コメント（4軸）は任意。
export default function ReviewForm({ postId, onCreated }) {
  const [good, setGood] = useState('');
  const [improvement, setImprovement] = useState('');
  const [axis, setAxis] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      onCreated?.(created);
    } catch (err) {
      const s = err.response?.status;
      if (s === 400) setError('自分の投稿にはレビューできません');
      else if (s === 404) setError('この投稿にはレビューできません');
      else setError('送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-800">レビューを書く</h3>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <label className="mb-1 block text-sm text-gray-600">✅ 良かった点（必須）</label>
      <textarea
        required
        value={good}
        onChange={(e) => setGood(e.target.value)}
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        rows={2}
      />
      <label className="mb-1 block text-sm text-gray-600">💡 もっと良くなる点（必須）</label>
      <textarea
        required
        value={improvement}
        onChange={(e) => setImprovement(e.target.value)}
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        rows={2}
      />
      <p className="mb-2 text-xs text-gray-400">観点別コメント（任意・埋めたい軸だけでOK）</p>
      {AXES.map((a) => (
        <div key={a.key} className="mb-2">
          <label className="mb-1 block text-xs text-gray-500">{a.label}</label>
          <input
            value={axis[a.key] ?? ''}
            onChange={(e) => setAxis((prev) => ({ ...prev, [a.key]: e.target.value }))}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? '送信中…' : 'レビューを投稿'}
      </button>
    </form>
  );
}
