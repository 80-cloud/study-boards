import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 未ログインはログイン画面へ。実際の認可は backend（共通設計方針：ここは UX 補助）。
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-500">読み込み中…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
