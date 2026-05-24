import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProfile, updateMyProfile } from '../api/profile';
import { ROLE_LABEL, EVAL_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import AvatarUploader from '../components/AvatarUploader';

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
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header className="overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-b from-[#f4f8ff] to-[#eaf1fb] p-6 shadow-mac-sm sm:p-7">
        <div className="flex items-start gap-4">
          <Avatar url={avatarUrl} name={displayName} size="lg" />
          <div className="flex-1">
            <h2 className="mac-h text-2xl">
              {displayName}
              <span className="ml-2 rounded-full bg-navy-700/10 px-2.5 py-0.5 text-xs font-semibold text-navy-700">{ROLE_LABEL[role] ?? role}</span>
            </h2>
            {bio && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{bio}</p>}
          </div>
          {isOwn && (
            <button onClick={() => setEditing(true)} className="text-sm font-semibold text-brand-500 hover:underline">プロフィール編集</button>
          )}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <Stat label="もらったレビュー" value={stats.receivedReviewsCount} />
          <Stat label="したレビュー" value={stats.givenReviewsCount} />
          <Stat label="もらった🙏" value={stats.thanksReceivedCount} />
        </div>
      </header>

      {editing && (
        <ProfileEditModal
          profile={profile}
          onSaved={(p) => { setProfile(p); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}

      {streak && <StreakCard streak={streak} />}

      <section>
        <h3 className="mac-h mb-3 text-lg">投稿した成果物（{posts.length}）</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">まだ投稿がありません。</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.postId} className="mac-panel flex items-center justify-between p-3">
                <Link to={`/posts/${p.postId}`} className="text-sm font-semibold text-navy-700 hover:underline">{p.title}</Link>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  レビュー {p.reviewCount}
                  {p.approved && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">🏅 合格</span>}
                  {p.evaluationResult === 'RETURNED' && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">{EVAL_LABEL.RETURNED}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mac-h mb-3 text-lg">もらったレビュー（{receivedReviews.length}）</h3>
        {receivedReviews.length === 0 ? (
          <p className="text-sm text-gray-500">まだありません。</p>
        ) : (
          <ul className="space-y-2">
            {receivedReviews.map((r) => (
              <li key={r.reviewId} className={`rounded-2xl border p-3 text-sm shadow-mac-sm ${r.teacherReview ? 'border-amber-300 bg-amber-50' : 'border-black/5 bg-white/75'}`}>
                <span className="font-semibold text-gray-700">{r.reviewerDisplayName}</span>
                {r.teacherReview && <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-800">講師</span>}
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
// 採用案：macOS の設定シート風モーダル（中央オーバーレイ＋背景ブラー）。
function ProfileEditModal({ profile, onSaved, onCancel }) {
  const { refreshUser } = useAuth();
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarKey, setAvatarKey] = useState(profile.avatarKey ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Esc で閉じる＋背景スクロール固定（mac シートの作法）。
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onCancel]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const updated = await updateMyProfile({ bio: bio || null, avatarKey });
      onSaved(updated);
      // ヘッダー（通知ベル横）のアバター等を最新化（AuthContext の user を引き直す）。
      refreshUser().catch(() => {});
    } catch {
      setErr('保存に失敗しました');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景：半透明＋ブラー（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      {/* シート本体 */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="border-b border-black/5 px-6 py-4 text-center">
          <h2 className="text-base font-bold text-navy-700">プロフィールを編集</h2>
        </div>

        <div className="space-y-5 px-6 py-6">
          {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

          {/* アバター：中央に配置 */}
          <div className="flex flex-col items-center gap-2">
            <AvatarUploader initialUrl={profile.avatarUrl ?? ''} onChange={(key) => setAvatarKey(key)} />
            <p className="text-xs text-gray-400">PNG / JPEG / WebP・5MB まで・正方形に切り抜き</p>
          </div>

          {/* 表示名（読み取り専用） */}
          <div>
            <label className="mac-label">表示名</label>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500 ring-1 ring-black/5">{profile.displayName}</div>
          </div>

          {/* 自己紹介 */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="mac-label !mb-0">自己紹介</label>
              <span className="text-xs tabular-nums text-gray-400">{bio.length}/500</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="学んでいること・興味のある分野など"
              className="mac-input"
            />
          </div>
        </div>

        {/* フッター：mac シート（キャンセル左／保存右） */}
        <div className="flex justify-end gap-2 border-t border-black/5 bg-gray-50/70 px-6 py-4">
          <button onClick={onCancel} className="mac-btn-ghost">キャンセル</button>
          <button onClick={save} disabled={busy} className="mac-btn-brand">
            {busy ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/95 p-3 shadow-mac-sm">
      <div className="text-2xl font-extrabold text-navy-700">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// F-STREAK-01 継続の可視化（§1-6 継続は力なり・非競争）。投稿/レビューの活動日から集計した値を表示。
function StreakCard({ streak }) {
  const { currentStreak, longestStreak, totalActiveDays, achievedBadges = [] } = streak;
  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-mac-sm">
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
