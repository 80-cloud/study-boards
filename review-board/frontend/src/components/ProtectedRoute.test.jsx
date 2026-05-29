import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// useAuth を差し替えて状態を制御する。
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>ログイン画面</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <div>保護コンテンツ</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => mockUseAuth.mockReset());

  it('loading 中は中身を出さず読み込み表示にする（ちらつき防止）', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/secret');
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();
    expect(screen.queryByText('保護コンテンツ')).not.toBeInTheDocument();
  });

  it('未ログインのとき /login にリダイレクトする', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/secret');
    expect(screen.getByText('ログイン画面')).toBeInTheDocument();
    expect(screen.queryByText('保護コンテンツ')).not.toBeInTheDocument();
  });

  it('ログイン済みのとき children を描画する', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, name: 'u1' }, loading: false });
    renderAt('/secret');
    expect(screen.getByText('保護コンテンツ')).toBeInTheDocument();
  });
});
