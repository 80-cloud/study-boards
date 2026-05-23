import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProfile, updateMyProfile } from '../api/profile';
import { ROLE_LABEL, EVAL_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import ScreenshotUploader from '../components/ScreenshotUploader';

// F-PROF：成長記録ページ（本アプリの主役）。投稿履歴・もらったレビュー・実績・合格バッジ・継続。
export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setEditing(false);
    fetchProfile(id)
      .then(setProfile)
      .catch((e) => setError(e.response?.status === 404 ? 'この成長記録は閲覧できません' : '取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-gray-500">読み込み中…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  const { displayName, role, bio, avatarUrl, stats, streak, posts, receivedReviews } = profile;
  const isOwn = user?.id === profile.userId;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="rounded-lg border border-gray-200 bg-white p-6">
        {editing ? (
          <ProfileEditor profile={profile} onSaved={(p) => { setProfile(p); setEditing(false); }} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex items-start gap-4">
              <Avatar url={avatarUrl} name={displayName} size="lg" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800">
                  {displayName}
                  <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{ROLE_LABEL[role] ?? role}</span>
                </h2>
                {bio && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{bio}</p>}
              </div>
              {isOwn && (
                <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">プロフィール編集</button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <Stat label="もらったレビュー" value={stats.receivedReviewsCount} />
              <Stat label="したレビュー" value={stats.givenReviewsCount} />
              <Stat label="もらった🙏" value={stats.thanksReceivedCount} />
            </div>
          </>
        )}
      </header>

      {streak && <StreakCard streak={streak} />}

      <section>
        <h3 className="mb-3 font-medium text-gray-800">投稿した成果物（{posts.length}）</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">まだ投稿がありません。</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.postId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                <Link to={`/posts/${p.postId}`} className="text-sm font-medium text-gray-800 hover:underline">{p.title}</Link>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  レビュー {p.reviewCount}
                  {p.approved && <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">🏅 合格</span>}
                  {p.evaluationResult === 'RETURNED' && <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700">{EVAL_LABEL.RETURNED}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-medium text-gray-800">もらったレビュー（{receivedReviews.length}）</h3>
        {receivedReviews.length === 0 ? (
          <p className="text-sm text-gray-500">まだありません。</p>
        ) : (
          <ul className="space-y-2">
            {receivedReviews.map((r) => (
              <li key={r.reviewId} className={`rounded-lg border p-3 text-sm ${r.teacherReview ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                <span className="font-medium text-gray-700">{r.reviewerDisplayName}</span>
                {r.teacherReview && <span className="ml-2 rounded bg-amber-200 px-2 py-0.5 text-xs text-amber-800">講師</span>}
                <span className="ml-2 text-xs text-gray-400">🙏 {r.thanksCount}</span>
                <p className="mt-1 text-gray-600">{r.good}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// F-PROF（S-04）プロフィール編集：アバター差し替え＋自己紹介。本人のみ（backend が principal で限定）。
// avatarKey は現在値を初期値に持ち、差し替え時のみ更新。bio＋avatarKey を常に送って全置換する
// （送らないと backend が null 扱いで既存アバターを消すため）。
function ProfileEditor({ profile, onSaved, onCancel }) {
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarKey, setAvatarKey] = useState(profile.avatarKey ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const updated = await updateMyProfile({ bio: bio || null, avatarKey });
      onSaved(updated);
    } catch {
      setErr('保存に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-800">プロフィール編集</h2>
      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      <div className="flex items-start gap-4">
        <Avatar url={profile.avatarUrl} name={profile.displayName} size="lg" />
        <div className="flex-1">
          <p className="mb-1 text-sm text-gray-600">アバター画像（PNG/JPEG/WebP・5MB まで）</p>
          <ScreenshotUploader initialUrl={profile.avatarUrl ?? ''} onChange={(key) => setAvatarKey(key)} />
        </div>
      </div>
      <label className="block text-sm text-gray-600">自己紹介</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={500}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? '保存中…' : '保存'}
        </button>
        <button onClick={onCancel} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">キャンセル</button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// F-STREAK-01 継続の可視化（§1-6 継続は力なり・非競争）。投稿/レビューの活動日から集計した値を表示。
function StreakCard({ streak }) {
  const { currentStreak, longestStreak, totalActiveDays, achievedBadges = [] } = streak;
  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50 p-6">
      <h3 className="mb-3 font-medium text-orange-800">継続の記録 <span className="text-xs font-normal text-orange-600">（投稿・レビューを続けた日数）</span></h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="現在の連続" value={`🔥 ${currentStreak}日`} />
        <Stat label="最長連続" value={`🏔️ ${longestStreak}日`} />
        <Stat label="活動した日" value={`📅 ${totalActiveDays}日`} />
      </div>
      {achievedBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-orange-700">達成バッジ：</span>
          {achievedBadges.map((d) => (
            <span key={d} className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-300">
              🏅 {d}日連続
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
