import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AXIS_LABEL } from '../constants';
import { sendThanks, updateReview, deleteReview } from '../api/reviews';

// 1 件のレビュー表示。講師レビューは特別表示（F-REV-02）。
// 投稿者には「ありがとう」（F-REV-03）、レビュー所有者には編集/削除を出す（権限は backend が判定）。
export default function ReviewItem({ review, canThank, isOwner, onChanged }) {
  const [thanks, setThanks] = useState(review.thanksCount);
  const [thanked, setThanked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [good, setGood] = useState(review.good);
  const [improvement, setImprovement] = useState(review.improvement);

  const thank = async () => {
    setBusy(true);
    try {
      await sendThanks(review.id);
      setThanks((n) => n + 1);
      setThanked(true);
      onChanged?.();
    } catch {
      setThanked(true);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      // 既存の観点別コメントは保持して再送（backend は update で入れ替えるため）
      const axisComments = (review.axisComments ?? []).map((c) => ({ axis: c.axis, comment: c.comment }));
      await updateReview(review.id, { good, improvement, axisComments });
      setEditing(false);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('このレビューを削除しますか？')) return;
    setBusy(true);
    try {
      await deleteReview(review.id);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`rounded-lg border p-4 ${review.teacherReview ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <Link to={`/users/${review.reviewerUserId}/profile`} className="font-medium text-gray-800 hover:underline">
          {review.reviewerDisplayName}
        </Link>
        {review.teacherReview && (
          <span className="rounded bg-amber-200 px-2 py-0.5 text-xs text-amber-800">講師レビュー</span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea value={good} onChange={(e) => setGood(e.target.value)} rows={2} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <textarea value={improvement} onChange={(e) => setImprovement(e.target.value)} rows={2} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">保存</button>
            <button onClick={() => { setEditing(false); setGood(review.good); setImprovement(review.improvement); }} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">キャンセル</button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-700"><span className="text-green-600">✅ 良かった点：</span>{review.good}</p>
          <p className="mt-1 text-sm text-gray-700"><span className="text-blue-600">💡 改善点：</span>{review.improvement}</p>
          {review.axisComments?.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {review.axisComments.map((c) => (
                <li key={c.axis} className="text-xs text-gray-600">
                  <span className="text-gray-400">{AXIS_LABEL[c.axis] ?? c.axis}：</span>{c.comment}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>🙏 ありがとう {thanks}</span>
        {canThank && (
          <button onClick={thank} disabled={busy || thanked} className="rounded border border-gray-300 px-2 py-0.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {thanked ? '送信済み' : 'ありがとうを送る'}
          </button>
        )}
        {isOwner && !editing && (
          <>
            <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline">編集</button>
            <button onClick={remove} disabled={busy} className="text-red-500 hover:underline disabled:opacity-50">削除</button>
          </>
        )}
      </div>
    </li>
  );
}
