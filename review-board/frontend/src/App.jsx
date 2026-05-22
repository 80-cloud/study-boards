import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import PostsPage from './pages/PostsPage';
import NewPostPage from './pages/NewPostPage';
import PostEditPage from './pages/PostEditPage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/ProfilePage';

// 認証必須ページの共通レイアウト（ヘッダー＋本文）。
function Shell({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        {children}
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Shell><PostsPage /></Shell>} />
        <Route path="/posts/new" element={<Shell><NewPostPage /></Shell>} />
        <Route path="/posts/:id/edit" element={<Shell><PostEditPage /></Shell>} />
        <Route path="/posts/:id" element={<Shell><PostDetailPage /></Shell>} />
        <Route path="/users/:id/profile" element={<Shell><ProfilePage /></Shell>} />
      </Routes>
    </AuthProvider>
  );
}
