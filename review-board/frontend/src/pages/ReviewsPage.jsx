import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCohortReviews } from '../api/reviews';
import MarkdownText from '../components/MarkdownText';
import Avatar from '../components/Avatar';

// 投稿日の簡易フォーマット（YYYY/MM/DD）。
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

// #210 cohort 全体のレビュー一覧。トップ統計「レビュー」タイルからの導線。
// ★S軸：API（GET /api/reviews）が自 cohort の投稿に付いたレビューだけを返す（越境しない）。
export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCohortReviews()
      .then(setReviews)
      .catch(() => setError('レビューの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="mac-eyebrow">REVIEWS</p>
      <h1 className="mac-h mt-1 text-[26px]">みんなのレビュー</h1>
      <p className="mt-2 text-sm text-gray-600">
        同じ期（cohort）の成果物に寄せられたレビューの一覧です。読む・読まれる経験が成長につながります。
      </p>

      <div className="mt-8">
        {loading ? (
          <p className="py-16 text-center text-gray-400">読み込み中…</p>
        ) : error ? (
          <p className="py-16 text-center text-red-500">{error}</p>
        ) : reviews.length === 0 ? (
          <p className="py-16 text-center text-gray-400">まだレビューがありません。</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li
                key={r.id}
                className={`overflow-hidden rounded-2xl border shadow-mac-sm ${
                  r.teacherReview ? 'border-amber-200 bg-amber-50/40' : 'border-black/5 bg-white'
                }`}
              >
                {/* ヘッダー帯：どの投稿への、誰のレビューか */}
                <div className="flex items-center gap-3 border-b border-black/5 px-5 py-3.5">
                  <Avatar url={r.reviewerAvatarUrl} name={r.reviewerDisplayName} size="md" />
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-2">
                      <Link to={`/users/${r.reviewerUserId}/profile`} className="font-bold text-navy-700 hover:underline">
                        {r.reviewerDisplayName}
                      </Link>
                      {r.teacherReview && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">講師レビュー</span>
                      )}
                    </div>
                    <Link to={`/posts/${r.postId}`} className="text-xs text-gray-500 hover:text-brand-600 hover:underline">
                      ▶ {r.postTitle}
                    </Link>
                  </div>
                  <span className="ml-auto whitespace-nowrap text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
                </div>

                {/* 本文：良かった点／改善点 */}
                <div className="space-y-3 p-5">
                  <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-sm leading-relaxed text-gray-700 ring-1 ring-green-100">
                    <div className="mb-1 font-bold text-green-700">✅ 良かった点</div>
                    <MarkdownText>{r.good}</MarkdownText>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 p-4 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-100">
                    <div className="mb-1 font-bold text-sky-700">💡 改善点</div>
                    <MarkdownText>{r.improvement}</MarkdownText>
                  </div>
                </div>

                {/* フッター：リアクション件数＋投稿への導線 */}
                <div className="flex items-center gap-3 border-t border-black/5 bg-black/[0.012] px-5 py-2.5 text-xs text-gray-500">
                  <span>🙏 {r.thanksCount}</span>
                  <span>💬 {r.repliesCount}</span>
                  <Link to={`/posts/${r.postId}`} className="ml-auto font-semibold text-brand-500 hover:underline">
                    投稿を見る ›
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
