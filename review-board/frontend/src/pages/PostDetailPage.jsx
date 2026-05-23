import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPost, deletePost, selectBestReview } from '../api/posts';
import { fetchReviews } from '../api/reviews';
import { fetchEvaluation } from '../api/evaluations';
import { useAuth } from '../context/AuthContext';
import ReviewForm from '../components/ReviewForm';
import ReviewItem from '../components/ReviewItem';
import EvaluationPanel from '../components/EvaluationPanel';

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
      .catch((err) => setError(err.response?.status === 404 ? 'この投稿は見つかりません' : '取得に失敗しました'))
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
    } catch {
      setError('削除に失敗しました');
    }
  };

  // F-REV-05 ベストレビュー選択（投稿者のみ）。成功したら投稿を再取得してバッジを反映。
  const chooseBest = async (reviewId) => {
    try {
      const updated = await selectBestReview(post.id, reviewId);
      setPost(updated);
    } catch {
      setError('ベストレビューの選択に失敗しました');
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← 一覧へ</Link>

      <article className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-800">{post.title}</h2>
          {isAuthor && (
            <div className="flex gap-3 text-sm">
              <Link to={`/posts/${post.id}/edit`} className="text-blue-600 hover:underline">編集</Link>
              <button onClick={removePost} className="text-red-500 hover:underline">削除</button>
            </div>
          )}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{post.description}</p>
        {post.screenshotUrl && (
          <img src={post.screenshotUrl} alt={`${post.title} のスクリーンショット`} className="mt-4 max-h-96 rounded border border-gray-200" />
        )}
        <div className="mt-3 flex gap-4 text-sm">
          {post.repoUrl && <a href={post.repoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">リポジトリ</a>}
          {post.demoUrl && <a href={post.demoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">デモ</a>}
        </div>
      </article>

      <EvaluationPanel postId={post.id} evaluation={evaluation} isTeacher={isTeacher} onEvaluated={setEvaluation} />

      <section>
        <h3 className="mb-3 font-medium text-gray-800">レビュー（{reviews.length}）</h3>
        {reviews.length === 0 ? (
          <p className="mb-4 text-sm text-gray-500">まだレビューがありません。</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {reviews.map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                canThank={isAuthor}
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
