import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProfile, updateMyProfile } from '../api/profile';
import { fetchNotificationPrefs, updateNotificationPrefs } from '../api/notificationPrefs';
import { setupMfa, enableMfa, disableMfa, getRecoveryStatus, regenerateRecoveryCodes } from '../api/mfa';
import { exportMyData, deleteMyAccount } from '../api/me';
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

      {isOwn && <NotificationPrefsCard />}

      {isOwn && <MfaCard />}

      {isOwn && <DataPrivacyCard />}

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

          {/* 表示名（読み取り専用＝コントロールが無いので label ではなく見出し用 div） */}
          <div>
            <div className="mac-label">表示名</div>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500 ring-1 ring-black/5">{profile.displayName}</div>
          </div>

          {/* 自己紹介 */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="profile-bio" className="mac-label !mb-0">自己紹介</label>
              <span className="text-xs tabular-nums text-gray-400">{bio.length}/500</span>
            </div>
            <textarea
              id="profile-bio"
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

// C-5（#233）通知設定：本人のみ表示。メール通知のオフ（opt-out）と週次ダイジェストを切り替える。
// 変更はトグル操作ごとに即保存し、失敗時は元に戻す（楽観的更新）。
function NotificationPrefsCard() {
  const [prefs, setPrefs] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotificationPrefs()
      .then(setPrefs)
      .catch(() => setError('通知設定を取得できませんでした'))
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // 楽観的更新
    setError('');
    try {
      const saved = await updateNotificationPrefs(next);
      setPrefs(saved);
    } catch {
      setPrefs(prefs); // 失敗したら戻す
      setError('保存に失敗しました');
    }
  };

  if (!loaded) return null;

  return (
    <section className="mac-panel p-5">
      <h3 className="mac-h mb-1 text-lg">通知設定</h3>
      <p className="mb-4 text-xs text-gray-500">メールの受け取りを管理できます。</p>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {prefs && (
        <div className="space-y-1">
          <Toggle
            label="メール通知"
            desc="あなたの成果物にレビューが届いたときにメールでお知らせします。"
            checked={prefs.emailEnabled}
            onChange={() => toggle('emailEnabled')}
          />
          <Toggle
            label="週次ダイジェスト"
            desc="レビュー待ちの成果物などを週に1回まとめてお届けします。"
            checked={prefs.weeklyDigest}
            disabled={!prefs.emailEnabled}
            onChange={() => toggle('weeklyDigest')}
          />
        </div>
      )}
    </section>
  );
}

// アクセシブルなトグルスイッチ（role=switch・aria-checked）。
function Toggle({ label, desc, checked, onChange, disabled = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl px-1 py-2.5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        <div className="text-sm font-semibold text-navy-700">{label}</div>
        <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed ${
          checked ? 'bg-brand-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

// C-6（#235）二要素認証（TOTP）設定：本人のみ。setup→QR表示→コードで有効化／コードで無効化。
// #241 有効化時にリカバリコードを表示・残数表示・再生成も担う（端末紛失時の自己復旧手段）。
function MfaCard() {
  const { user, refreshUser } = useAuth();
  const enabled = !!user?.mfaEnabled;
  const [setup, setSetup] = useState(null); // { qrDataUri }（setup 中のみ）
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null); // 発行直後だけ生コードを保持（1度きり表示）
  const [recovery, setRecovery] = useState(null); // { remaining, lowThreshold }
  const [regenerating, setRegenerating] = useState(false);
  const [regenCode, setRegenCode] = useState('');

  // 有効時のみ残数を取得（コード一覧表示中は再取得しない＝消えないように）。
  useEffect(() => {
    if (!enabled) { setRecovery(null); return; }
    getRecoveryStatus().then(setRecovery).catch(() => setRecovery(null));
  }, [enabled, recoveryCodes]);

  const startSetup = async () => {
    setError('');
    setBusy(true);
    try {
      setSetup(await setupMfa());
    } catch {
      setError('セットアップを開始できませんでした');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await enableMfa(code);
      await refreshUser();
      setSetup(null);
      setCode('');
      setRecoveryCodes(res.recoveryCodes); // 1度きりの表示
    } catch (err) {
      setError(err.response?.status === 400 ? 'コードが正しくありません' : '有効化に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const confirmDisable = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await disableMfa(code);
      await refreshUser();
      setCode('');
      setRecoveryCodes(null);
    } catch (err) {
      setError(err.response?.status === 400 ? 'コードが正しくありません' : '無効化に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const confirmRegenerate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await regenerateRecoveryCodes(regenCode);
      setRecoveryCodes(res.recoveryCodes);
      setRegenerating(false);
      setRegenCode('');
    } catch (err) {
      setError(err.response?.status === 400 ? 'コードが正しくありません' : '再生成に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mac-panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="mac-h text-lg">二要素認証（2FA）</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? '有効' : '無効'}
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        認証アプリ（Google Authenticator 等）のワンタイムコードでログインを保護します。
      </p>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* 発行直後のリカバリコード一覧（1度きり表示・最優先） */}
      {recoveryCodes && (
        <RecoveryCodesPanel codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
      )}

      {/* 無効 & setup 未開始：開始ボタン */}
      {!recoveryCodes && !enabled && !setup && (
        <button onClick={startSetup} disabled={busy} className="mac-btn-brand">
          {busy ? '準備中…' : '二要素認証を設定する'}
        </button>
      )}

      {/* setup 中：QR ＋ コード入力で有効化 */}
      {!recoveryCodes && !enabled && setup && (
        <form onSubmit={confirmEnable} className="space-y-3">
          <p className="text-sm text-gray-600">認証アプリ（Google Authenticator 等）で以下の QR コードを読み取ってください。</p>
          <img src={setup.qrDataUri} alt="TOTP QR コード" className="h-44 w-44 rounded-lg ring-1 ring-black/5" />
          <label className="mac-label" htmlFor="mfa-enable-code">アプリに表示された6桁コード</label>
          <input
            id="mfa-enable-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mac-input"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSetup(null); setCode(''); setError(''); }} className="mac-btn-ghost">キャンセル</button>
            <button type="submit" disabled={busy} className="mac-btn-brand">{busy ? '確認中…' : '有効化する'}</button>
          </div>
        </form>
      )}

      {/* 有効：残数表示＋再生成＋無効化 */}
      {!recoveryCodes && enabled && (
        <div className="space-y-4">
          {recovery && (
            <div className={`rounded-xl px-3 py-2 text-sm ${recovery.remaining <= recovery.lowThreshold ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
              リカバリコードの残り：<span className="font-semibold">{recovery.remaining}</span> 個
              {recovery.remaining <= recovery.lowThreshold && (
                <span className="ml-1">— 残りが少なくなっています。再生成をおすすめします。</span>
              )}
              <button type="button" onClick={() => { setRegenerating((v) => !v); setError(''); }} className="ml-2 underline">
                {regenerating ? 'キャンセル' : '再生成する'}
              </button>
            </div>
          )}

          {/* 再生成：現在の6桁コードで本人確認 */}
          {regenerating && (
            <form onSubmit={confirmRegenerate} className="space-y-2">
              <label className="mac-label" htmlFor="mfa-regen-code">再生成するには現在の6桁コードを入力</label>
              <input
                id="mfa-regen-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mac-input"
              />
              <p className="text-xs text-gray-500">再生成すると、これまでのリカバリコードはすべて使えなくなります。</p>
              <button type="submit" disabled={busy} className="mac-btn-brand">{busy ? '再生成中…' : 'リカバリコードを再生成'}</button>
            </form>
          )}

          <form onSubmit={confirmDisable} className="space-y-3 border-t border-black/5 pt-4">
            <label className="mac-label" htmlFor="mfa-disable-code">無効化するには現在の6桁コードを入力</label>
            <input
              id="mfa-disable-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mac-input"
            />
            <button type="submit" disabled={busy} className="mac-btn-ghost text-red-600">{busy ? '確認中…' : '二要素認証を無効にする'}</button>
          </form>
        </div>
      )}
    </section>
  );
}

// #241 発行直後のリカバリコードを1度だけ表示する。コピー／ダウンロードを提供し、保存後に閉じる。
function RecoveryCodesPanel({ codes, onDone }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* クリップボード不可の環境は無視（ダウンロードで代替） */
    }
  };

  const download = () => {
    const blob = new Blob([`${text}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-board-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 rounded-xl bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">リカバリコード（今だけ表示されます）</p>
      <p className="text-xs text-amber-700">
        認証アプリを使えなくなったとき、これらのコードで1回ずつログインできます。安全な場所に保管してください。
        この画面を閉じると二度と表示できません。
      </p>
      <ul className="grid grid-cols-2 gap-1.5 rounded-lg bg-white p-3 font-mono text-sm text-gray-800">
        {codes.map((c) => (
          <li key={c} className="tracking-wider">{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="mac-btn-ghost">{copied ? 'コピーしました' : 'コピー'}</button>
        <button type="button" onClick={download} className="mac-btn-ghost">ダウンロード</button>
        <button type="button" onClick={onDone} className="mac-btn-brand">保存しました（閉じる）</button>
      </div>
    </div>
  );
}

// データと privacy（本人のみ・#261/#263）。自分のデータの JSON エクスポートと退会（論理削除＋匿名化）。
function DataPrivacyCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const onExport = async () => {
    setError('');
    setBusy(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('エクスポートに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setError('');
    setBusy(true);
    try {
      await deleteMyAccount();
      // サーバが認証 Cookie を消すので、全状態を破棄して公開ページへ。
      window.location.assign('/login');
    } catch {
      setError('退会処理に失敗しました');
      setBusy(false);
    }
  };

  return (
    <section className="mac-panel p-5">
      <h3 className="mac-h text-lg">データと privacy</h3>
      <p className="mb-4 mt-1 text-xs text-gray-500">
        あなたのプロフィール・投稿・レビューを JSON 形式でダウンロードできます。
      </p>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button onClick={onExport} disabled={busy} className="mac-btn-ghost">
        {busy ? '準備中…' : 'データをエクスポート'}
      </button>

      <div className="mt-5 border-t border-black/5 pt-4">
        <h4 className="text-sm font-semibold text-gray-700">退会（アカウント削除）</h4>
        <p className="mt-1 text-xs text-gray-500">
          退会すると、メールアドレス・表示名などの個人情報は削除（匿名化）され、以後ログインできなく
          なります。これまでの投稿・レビューは「退会したユーザー」の寄与として残ります。この操作は取り消せません。
        </p>
        {!confirmingDelete ? (
          <button onClick={() => { setConfirmingDelete(true); setError(''); }} disabled={busy}
            className="mac-btn-ghost mt-3 text-red-600">退会する</button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-600">本当に退会しますか？</span>
            <button onClick={onDelete} disabled={busy} className="mac-btn-ghost text-red-600">
              {busy ? '処理中…' : '退会を確定する'}
            </button>
            <button onClick={() => setConfirmingDelete(false)} disabled={busy} className="mac-btn-ghost">
              キャンセル
            </button>
          </div>
        )}
      </div>
    </section>
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
