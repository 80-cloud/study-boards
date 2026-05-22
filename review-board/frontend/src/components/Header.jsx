import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../constants';

export default function Header() {
  const { user, logout } = useAuth();
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
