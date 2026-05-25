import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUnreadCount } from '../api/notifications';
import Avatar from './Avatar';
import DolphinIcon from './DolphinIcon';
import { APP_NAME } from '../constants';

// F-NOTIF-01：未読通知数のポーリング間隔（WebSocket は使わない）。
const POLL_MS = 30000;

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');

  // ログイン中だけポーリング。画面遷移のたびにも即時更新（通知センターで既読化した直後の反映用）。
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const tick = () => fetchUnreadCount().then((c) => { if (alive) setUnread(c); }).catch(() => {});
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [user, location.pathname]);

  // ページが切り替わったら検索欄をクリア（前ページの語が残って ?q= 由来の自動スクロールが起きるのを防ぐ）。
  // 同一パス内の検索（トップ "/" → "/?q=..."）では pathname が変わらないので入力は保持される。
  useEffect(() => { setQ(''); }, [location.pathname]);

  // ヘッダー検索：トップへ ?q= を渡して遷移（PostsPage が URL から初期値を拾う）。
  const submitSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[17px] font-extrabold tracking-tight text-navy-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f3ff] ring-1 ring-black/5">
            <DolphinIcon className="h-6 w-6" />
          </span>
          {APP_NAME}
        </Link>
        {user && (
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <form onSubmit={submitSearch} className="relative hidden w-48 lg:block xl:w-56">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="作品を探す"
                className="w-full rounded-full border border-black/10 bg-black/[0.03] py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent-400 focus:bg-white"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </form>
            <Link to="/posts/new" className="hidden shrink-0 whitespace-nowrap rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 sm:inline-flex">＋ 投稿する</Link>
            {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
              <Link to="/invites" className="hidden shrink-0 whitespace-nowrap text-sm font-medium text-gray-600 transition hover:text-navy-700 lg:inline">招待</Link>
            )}
            <Link to="/notifications" className="relative text-gray-500 transition hover:text-navy-700" aria-label={`通知${unread > 0 ? `（未読 ${unread} 件）` : ''}`}>
              <span className="inline-block text-xl leading-none">🔔</span>
              {unread > 0 && (
                <span className="absolute -right-2 -top-1 rounded-full bg-cherry-500 px-1.5 text-xs font-bold text-white shadow-sm">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <Link to={`/users/${user.id}/profile`} aria-label={`${user.displayName} のプロフィール`} className="flex shrink-0 items-center gap-2 text-sm text-gray-700 hover:text-navy-700">
              <Avatar url={user.avatarUrl} name={user.displayName} size="md" />
              <span className="hidden font-medium xl:inline">{user.displayName}</span>
            </Link>
            <button onClick={logout} className="shrink-0 whitespace-nowrap rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white">
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
