import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AXIS_LABEL, GROWTH_OPTIONS, GROWTH_MAP } from '../constants';
import { sendThanks, updateReview, deleteReview, restoreReview, fetchReplies, createReply, deleteReply, updateReviewGrowth } from '../api/reviews';
import { useAuth } from '../context/AuthContext';
import { useUndo } from '../context/UndoContext';
import MarkdownText from './MarkdownText';
import Avatar from './Avatar';
import ConfirmDialog from './ConfirmDialog';

// 1 件のレビュー表示。講師レビューは特別表示（F-REV-02）。
// 投稿者には「ありがとう」（F-REV-03）、レビュー所有者には編集/削除を出す（権限は backend が判定）。
// F-GROW-01：投稿者（canManageGrowth）は各レビューの対応状態と Before-After を記録できる。
export default function ReviewItem({ review, canThank, canManageGrowth, isOwner, isBest, canSelectBest, onSelectBest, onChanged }) {
  const { user } = useAuth();
  const { requestUndo } = useUndo();
  const [thanks, setThanks] = useState(review.thanksCount);
  const [thanked, setThanked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [good, setGood] = useState(review.good);
  const [improvement, setImprovement] = useState(review.improvement);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // F-GROW-01 対応状態・Before-After
  const [growthStatus, setGrowthStatus] = useState(review.growthStatus ?? 'OPEN');
  const [beforeAfter, setBeforeAfter] = useState(review.beforeAfter ?? '');
  const [editingGrowth, setEditingGrowth] = useState(false);
  const [draftStatus, setDraftStatus] = useState(growthStatus);
  const [draftBA, setDraftBA] = useState(beforeAfter);

  const openGrowthEditor = () => {
    setDraftStatus(growthStatus);
    setDraftBA(beforeAfter);
    setEditingGrowth(true);
  };

  const saveGrowth = async () => {
    setBusy(true);
    try {
      const updated = await updateReviewGrowth(review.id, { status: draftStatus, beforeAfter: draftBA || null });
      setGrowthStatus(updated.growthStatus);
      setBeforeAfter(updated.beforeAfter ?? '');
      setEditingGrowth(false);
    } finally {
      setBusy(false);
    }
  };

  // F-REV-04 返信スレッド
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState(null); // null=未取得
  const [replyBody, setReplyBody] = useState('');
  const [replyCount, setReplyCount] = useState(review.repliesCount ?? 0);

  const loadReplies = async () => {
    const data = await fetchReplies(review.id);
    setReplies(data);
    setReplyCount(data.length);
  };
  const toggleReplies = async () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && replies === null) await loadReplies();
  };
  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      await createReply(review.id, replyBody.trim());
      setReplyBody('');
      await loadReplies();
    } finally {
      setBusy(false);
    }
  };
  const removeReply = async (replyId) => {
    setBusy(true);
    try {
      await deleteReply(replyId);
      await loadReplies();
    } finally {
      setBusy(false);
    }
  };

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

  const remove = () => setConfirmDelete(true);

  const confirmRemove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      const id = review.id;
      await deleteReview(id);
      onChanged?.();
      requestUndo('レビューを削除しました', async () => {
        await restoreReview(id);
        onChanged?.();
      });
    } finally {
      setBusy(false);
    }
  };

  // 案B4（プレミアム）：ヘッダー帯＋グラデ色ブロック＋セグメント型フッター。
  return (
    <li className={`overflow-hidden rounded-2xl border shadow-mac ${isBest ? 'border-yellow-300 bg-yellow-50/40' : review.teacherReview ? 'border-amber-200 bg-amber-50/40' : 'border-black/5 bg-white'}`}>
      {/* ヘッダー帯 */}
      <div className="flex items-center gap-3 border-b border-black/5 px-5 py-3.5">
        <Avatar url={review.reviewerAvatarUrl} name={review.reviewerDisplayName} size="md" />
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-2">
            <Link to={`/users/${review.reviewerUserId}/profile`} className="font-bold text-navy-700 hover:underline">
              {review.reviewerDisplayName}
            </Link>
            {isBest && (
              <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-[11px] font-semibold text-yellow-900 ring-1 ring-yellow-300">⭐ ベスト</span>
            )}
          </div>
          {review.teacherReview && <div className="text-xs font-medium text-amber-600">講師レビュー</div>}
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-navy-700/[0.06] px-2.5 py-1 text-xs font-semibold text-navy-700">
          🙏 <span className="tabular-nums">{thanks}</span>
        </span>
      </div>

      {/* 本文 */}
      <div className="space-y-3 p-5">
        {editing ? (
          <div className="space-y-2">
            <textarea value={good} onChange={(e) => setGood(e.target.value)} rows={2} className="mac-input" />
            <textarea value={improvement} onChange={(e) => setImprovement(e.target.value)} rows={2} className="mac-input" />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={busy} className="rounded-lg bg-navy-700 px-3 py-1 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50">保存</button>
              <button onClick={() => { setEditing(false); setGood(review.good); setImprovement(review.improvement); }} className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-black/[0.03]">キャンセル</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-sm leading-relaxed text-gray-700 ring-1 ring-green-100">
              <div className="mb-1 font-bold text-green-700">✅ 良かった点</div>
              <MarkdownText>{review.good}</MarkdownText>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 p-4 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-100">
              <div className="mb-1 font-bold text-sky-700">💡 改善点</div>
              <MarkdownText>{review.improvement}</MarkdownText>
            </div>
            {review.axisComments?.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-black/[0.02] p-3">
                {review.axisComments.map((c) => (
                  <li key={c.axis} className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-500">{AXIS_LABEL[c.axis] ?? c.axis}：</span>
                    <MarkdownText className="mt-0.5 text-xs">{c.comment}</MarkdownText>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* F-GROW-01 対応状態バッジ＋Before-After（OPEN かつ投稿者でない場合は出さない） */}
        {(growthStatus !== 'OPEN' || canManageGrowth) && (
          <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${GROWTH_MAP[growthStatus]?.badge ?? ''}`}>
                {GROWTH_MAP[growthStatus]?.label ?? growthStatus}
              </span>
              {canManageGrowth && !editingGrowth && (
                <button onClick={openGrowthEditor} className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 ring-1 ring-brand-400/40 transition hover:bg-brand-400/10">対応を記録</button>
              )}
            </div>
            {beforeAfter && !editingGrowth && (
              <div className="mt-1.5 text-xs text-gray-600"><span className="text-gray-400">Before→After：</span><MarkdownText className="mt-0.5 text-xs">{beforeAfter}</MarkdownText></div>
            )}
            {editingGrowth && (
              <div className="mt-2 space-y-2">
                <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-gray-700 outline-none">
                  {GROWTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <textarea
                  value={draftBA}
                  onChange={(e) => setDraftBA(e.target.value)}
                  rows={2}
                  placeholder="Before→After メモ（任意）：どう直したか、なぜ対応不要かなど"
                  className="mac-input text-xs"
                />
                <div className="flex gap-2">
                  <button onClick={saveGrowth} disabled={busy} className="rounded-lg bg-navy-700 px-3 py-1 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50">保存</button>
                  <button onClick={() => setEditingGrowth(false)} className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-black/[0.03]">キャンセル</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* セグメント型フッター */}
      <div className="flex flex-wrap items-center gap-1 border-t border-black/5 bg-black/[0.012] px-3 py-2 text-xs">
        {canThank && (
          <button onClick={thank} disabled={busy || thanked}
            className="rounded-lg px-3 py-1.5 font-medium text-gray-600 transition hover:bg-black/[0.05] disabled:opacity-50">
            {thanked ? '送信済み' : 'ありがとう'}
          </button>
        )}
        {isOwner && !editing && (
          <>
            <button onClick={() => setEditing(true)} className="rounded-lg px-3 py-1.5 font-medium text-gray-600 transition hover:bg-black/[0.05]">編集</button>
            <button onClick={remove} disabled={busy} className="rounded-lg px-3 py-1.5 font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50">削除</button>
          </>
        )}
        {/* F-REV-05：投稿者だけが、まだベストでないレビューを選べる */}
        {canSelectBest && !isBest && (
          <button onClick={() => onSelectBest?.(review.id)} className="rounded-lg px-3 py-1.5 font-medium text-yellow-700 transition hover:bg-yellow-50">
            ベストに選ぶ
          </button>
        )}
        {/* F-REV-04：返信スレッドの開閉 */}
        <button onClick={toggleReplies} className="rounded-lg px-3 py-1.5 font-medium text-gray-600 transition hover:bg-black/[0.05]">
          返信 {replyCount}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="レビューを削除しますか？"
        message="削除後 30 秒以内なら「元に戻す」で復元できます。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmDelete(false)}
      />

      {showReplies && (
        <div className="space-y-2 border-t border-black/5 px-5 py-3">
          {replies === null ? (
            <p className="text-xs text-gray-400">読み込み中…</p>
          ) : replies.length === 0 ? (
            <p className="text-xs text-gray-400">まだ返信がありません。</p>
          ) : (
            replies.map((rp) => (
              <div key={rp.id} className="rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <Link to={`/users/${rp.replierUserId}/profile`} className="text-xs font-semibold text-navy-700 hover:underline">
                    {rp.replierDisplayName}
                  </Link>
                  {user?.id === rp.replierUserId && (
                    <button onClick={() => removeReply(rp.id)} disabled={busy} className="text-xs text-red-500 hover:underline disabled:opacity-50">削除</button>
                  )}
                </div>
                <MarkdownText className="mt-1">{rp.body}</MarkdownText>
              </div>
            ))
          )}
          <form onSubmit={submitReply} className="flex gap-2">
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="返信を書く"
              className="mac-input py-1.5"
            />
            <button type="submit" disabled={busy || !replyBody.trim()} className="shrink-0 rounded-xl bg-navy-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
              返信
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
