import { useState } from 'react';
import { EVAL_LABEL } from '../constants';
import { evaluate } from '../api/evaluations';

// F-EVAL-01：講師の最終評価。受講生には現在の評価のみ表示、講師には評価フォームを出す。
// 出し分けは UX 補助で、実際の権限は backend（受講生の送信は 403）。
export default function EvaluationPanel({ postId, evaluation, isTeacher, onEvaluated }) {
  const [result, setResult] = useState('APPROVED');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const ev = await evaluate(postId, { result, comment });
      setComment('');
      onEvaluated?.(ev);
    } catch (err) {
      setError(err.response?.status === 403 ? '評価は講師のみ可能です' : '送信に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mac-card p-5">
      <h3 className="mac-h mb-3 text-base">講師による最終評価</h3>

      {evaluation ? (
        <div className={`mb-3 rounded-xl p-3 text-sm ${evaluation.approved ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          <span className="font-semibold">
            {evaluation.approved ? '🏅 合格' : '↩ 差し戻し'}
          </span>
          <p className="mt-1 text-gray-600">{evaluation.comment}</p>
        </div>
      ) : (
        <p className="mb-3 text-sm text-gray-500">まだ評価はありません。</p>
      )}

      {isTeacher && (
        <form onSubmit={submit} className="border-t border-black/5 pt-3">
          {error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="mb-2 flex gap-4 text-sm">
            {['APPROVED', 'RETURNED'].map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input type="radio" name="result" value={r} checked={result === r} onChange={() => setResult(r)} />
                {EVAL_LABEL[r]}
              </label>
            ))}
          </div>
          <textarea
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="評価コメント"
            className="mac-input mb-2"
            rows={2}
          />
          <button type="submit" disabled={busy} className="mac-btn-navy">
            {busy ? '送信中…' : '評価を確定'}
          </button>
        </form>
      )}
    </section>
  );
}
