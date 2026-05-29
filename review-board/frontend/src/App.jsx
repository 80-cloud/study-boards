import { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import { APP_NAME } from './constants';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetPage from './pages/PasswordResetPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import InvitesPage from './pages/InvitesPage';
import PostsPage from './pages/PostsPage';
import NewPostPage from './pages/NewPostPage';
import PostEditPage from './pages/PostEditPage';
import PostDetailPage from './pages/PostDetailPage';
import WorksPage from './pages/WorksPage';
import ReviewsPage from './pages/ReviewsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

// ページ（パス）が切り替わったらスクロール位置を先頭へ戻す。
// React Router は既定でスクロールを復元しないため、長いページから遷移すると
// 前ページのスクロール量が残り「自動スクロール」のように見えるのを防ぐ。
// 同一パス内の遷移（トップ "/" → "/?q=..."）では発火しないので、PostsPage の WORKS スクロールには干渉しない。
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// 認証必須ページの共通レイアウト（ヘッダー＋本文＋小フッター）。
// #494 P10：全画面から /help・/terms・/privacy に到達できる小フッター。
function Shell({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-black/5 bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-3 text-xs text-gray-400">
            <Link to="/help" className="hover:text-navy-700 hover:underline">ヘルプ / FAQ</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-navy-700 hover:underline">利用規約</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-navy-700 hover:underline">プライバシー</Link>
          </div>
        </footer>
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
        {/* 公開（ログイン不要）の法務ページ（#258） */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/" element={<Shell><PostsPage /></Shell>} />
        <Route path="/invites" element={<Shell><InvitesPage /></Shell>} />
        <Route path="/posts/new" element={<Shell><NewPostPage /></Shell>} />
        <Route path="/posts/:id/edit" element={<Shell><PostEditPage /></Shell>} />
        <Route path="/posts/:id" element={<Shell><PostDetailPage /></Shell>} />
        <Route path="/works" element={<Shell><WorksPage /></Shell>} />
        <Route path="/reviews" element={<Shell><ReviewsPage /></Shell>} />
        <Route path="/users/:id/profile" element={<Shell><ProfilePage /></Shell>} />
        <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
        {/* 運営ダッシュボード（講師/管理者専用・#275）。真の防御は backend 403。 */}
        <Route path="/dashboard" element={<Shell><DashboardPage /></Shell>} />
        {/* 存在しないパスは 404 ページへ（ブラウザ既定の白画面を防ぐ）。 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
