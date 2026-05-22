import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = { STUDENT: '受講生', TEACHER: '講師' };

export default function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="text-lg font-bold text-gray-800">review-board</h1>
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
