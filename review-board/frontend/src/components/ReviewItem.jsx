import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AXIS_LABEL } from '../constants';
import { sendThanks } from '../api/reviews';

// 1 件のレビュー表示。講師レビューは特別表示（F-REV-02）。
// 投稿者には「ありがとう」ボタンを出す（F-REV-03。実際の権限は backend が判定）。
export default function ReviewItem({ review, canThank, onThanked }) {
  const [thanks, setThanks] = useState(review.thanksCount);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const thank = async () => {
    setBusy(true);
    try {
      await sendThanks(review.id);
      setThanks((n) => n + 1);
      setDone(true);
      onThanked?.();
    } catch {
      // 既に送信済み等は穏やかに無視（冪等）
      setDone(true);
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
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>🙏 ありがとう {thanks}</span>
        {canThank && (
          <button
            onClick={thank}
            disabled={busy || done}
            className="rounded border border-gray-300 px-2 py-0.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {done ? '送信済み' : 'ありがとうを送る'}
          </button>
        )}
      </div>
    </li>
  );
}
