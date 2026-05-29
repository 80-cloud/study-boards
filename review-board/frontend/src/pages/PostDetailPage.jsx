import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPost, deletePost, selectBestReview, likePost, unlikePost } from '../api/posts';
import { fetchReviews } from '../api/reviews';
import { fetchEvaluation } from '../api/evaluations';
import { useAuth } from '../context/AuthContext';
import ReviewForm from '../components/ReviewForm';
import ReviewItem from '../components/ReviewItem';
import EvaluationPanel from '../components/EvaluationPanel';
import ReviewPrefBadges from '../components/ReviewPrefBadges';
import MarkdownText from '../components/MarkdownText';
import { getErrorMessage } from '../lib/errorMessages';

// 投稿詳細：本体＋レビュー一覧＋レビュー投稿＋講師評価。
export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(() => fetchReviews(id).then(setReviews), [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPost(id), fetchReviews(id), fetchEvaluation(id)])
      .then(([p, r, e]) => {
        setPost(p);
        setReviews(r);
        setEvaluation(e);
      })
      .catch((err) => setError(err.response?.status === 404
        ? 'この投稿は見つかりません'
        : getErrorMessage(err, '投稿を読み込めませんでした。少し待ってからもう一度お試しください')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-gray-500">読み込み中…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  const isAuthor = user?.id === post.authorUserId;
  const isTeacher = user?.role === 'TEACHER';

  const removePost = async () => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    try {
      await deletePost(post.id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, '削除できませんでした。少し待ってからもう一度お試しください'));
    }
  };

  // F-REV-05 ベストレビュー選択（投稿者のみ）。成功したら投稿を再取得してバッジを反映。
  const chooseBest = async (reviewId) => {
    try {
      const updated = await selectBestReview(post.id, reviewId);
      setPost(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'ベストレビューの選択に失敗しました。少し待ってからもう一度お試しください'));
    }
  };

  // いいね（👍）のトグル。更新後の件数と押下状態を反映。
  const toggleLike = async () => {
    try {
      const res = post.liked ? await unlikePost(post.id) : await likePost(post.id);
      setPost((p) => ({ ...p, likeCount: res.likeCount, liked: res.liked }));
    } catch (err) {
      setError(getErrorMessage(err, 'いいねに失敗しました。少し待ってからもう一度お試しください'));
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Link to="/" className="text-sm font-medium text-brand-500 hover:underline">← 一覧へ</Link>

      <article className="mac-card p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="mac-h text-2xl">{post.title}</h2>
          {isAuthor && (
            <div className="flex flex-shrink-0 gap-3 text-sm">
              <Link to={`/posts/${post.id}/edit`} className="font-medium text-brand-500 hover:underline">編集</Link>
              <button onClick={removePost} className="font-medium text-red-500 hover:underline">削除</button>
            </div>
          )}
        </div>
        <ReviewPrefBadges tones={post.reviewTones} aspects={post.reviewAspects} aiUsage={post.aiUsage} className="mt-3" />
        <MarkdownText className="mt-3">{post.description}</MarkdownText>
        {post.screenshotUrl && (
          <img src={post.screenshotUrl} alt={`${post.title} のスクリーンショット`} className="mt-4 max-h-96 rounded-xl border border-black/5 shadow-mac-sm" />
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={toggleLike}
            aria-pressed={post.liked}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition active:scale-[0.98] ${
              post.liked ? 'bg-navy-700 text-white shadow-mac-sm' : 'bg-white text-navy-700 ring-1 ring-black/10 hover:bg-black/[0.03]'
            }`}
          >
            👍 いいね <span className="tabular-nums">{post.likeCount}</span>
          </button>
          {post.repoUrl && <a href={post.repoUrl} target="_blank" rel="noreferrer" className="mac-btn-ghost">リポジトリ</a>}
          {post.demoUrl && <a href={post.demoUrl} target="_blank" rel="noreferrer" className="mac-btn-ghost">デモ</a>}
        </div>
      </article>

      <EvaluationPanel postId={post.id} evaluation={evaluation} isTeacher={isTeacher} onEvaluated={setEvaluation} />

      <section>
        <h3 className="mac-h mb-3 text-lg">レビュー（{reviews.length}）</h3>
        {reviews.length === 0 ? (
          <p className="mb-4 text-sm text-gray-500">まだレビューがありません。</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {reviews.map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                canThank={isAuthor}
                canManageGrowth={isAuthor}
                isOwner={user?.id === r.reviewerUserId}
                isBest={post.bestReviewId === r.id}
                canSelectBest={isAuthor}
                onSelectBest={chooseBest}
                onChanged={loadReviews}
              />
            ))}
          </ul>
        )}
        {/* 自分の投稿には自己レビュー不可（backend が 400）。フォームは他人の投稿でのみ出す。 */}
        {!isAuthor && <ReviewForm postId={post.id} onCreated={() => loadReviews()} />}
      </section>
    </main>
  );
}
