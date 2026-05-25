import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import { APP_NAME } from './constants';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetPage from './pages/PasswordResetPage';
import InvitesPage from './pages/InvitesPage';
import PostsPage from './pages/PostsPage';
import NewPostPage from './pages/NewPostPage';
import PostEditPage from './pages/PostEditPage';
import PostDetailPage from './pages/PostDetailPage';
import WorksPage from './pages/WorksPage';
import ReviewsPage from './pages/ReviewsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

// ページ（パス）が切り替わったらスクロール位置を先頭へ戻す。
// React Router は既定でスクロールを復元しないため、長いページから遷移すると
// 前ページのスクロール量が残り「自動スクロール」のように見えるのを防ぐ。
// 同一パス内の遷移（トップ "/" → "/?q=..."）では発火しないので、PostsPage の WORKS スクロールには干渉しない。
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// 認証必須ページの共通レイアウト（ヘッダー＋本文）。
function Shell({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header />
        {children}
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  // 表示名の単一ソース（constants.APP_NAME）をタブのタイトルにも反映する（仕込み）。
  useEffect(() => { document.title = APP_NAME; }, []);
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/" element={<Shell><PostsPage /></Shell>} />
        <Route path="/invites" element={<Shell><InvitesPage /></Shell>} />
        <Route path="/posts/new" element={<Shell><NewPostPage /></Shell>} />
        <Route path="/posts/:id/edit" element={<Shell><PostEditPage /></Shell>} />
        <Route path="/posts/:id" element={<Shell><PostDetailPage /></Shell>} />
        <Route path="/works" element={<Shell><WorksPage /></Shell>} />
        <Route path="/reviews" element={<Shell><ReviewsPage /></Shell>} />
        <Route path="/users/:id/profile" element={<Shell><ProfilePage /></Shell>} />
        <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
      </Routes>
    </AuthProvider>
  );
}
