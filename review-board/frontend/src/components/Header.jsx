import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../constants';
import { fetchUnreadCount } from '../api/notifications';

// F-NOTIF-01：未読通知数のポーリング間隔（WebSocket は使わない）。
const POLL_MS = 30000;

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // ログイン中だけポーリング。画面遷移のたびにも即時更新（通知センターで既読化した直後の反映用）。
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const tick = () => fetchUnreadCount().then((c) => { if (alive) setUnread(c); }).catch(() => {});
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [user, location.pathname]);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-bold text-gray-800">review-board</Link>
        {user && (
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">投稿一覧</Link>
            <Link to="/posts/new" className="hover:text-gray-900">新規投稿</Link>
            <Link to={`/users/${user.id}/profile`} className="hover:text-gray-900">自分の成長記録</Link>
          </nav>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-4 text-sm">
          <Link to="/notifications" className="relative text-gray-600 hover:text-gray-900" aria-label={`通知${unread > 0 ? `（未読 ${unread} 件）` : ''}`}>
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <span className="text-gray-600">
            {user.displayName}
            <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </span>
          <button
            onClick={logout}
            className="rounded border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50"
          >
            ログアウト
          </button>
        </div>
      )}
    </header>
  );
}
