import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage', () => {
  it('404 ラベルと「見つかりませんでした」見出しを描画する', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /見つかりません/ })).toBeInTheDocument();
  });

  it('トップ "/" へ戻るリンクがある（迷子防止）', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    const home = screen.getByRole('link', { name: /トップへ/ });
    expect(home).toHaveAttribute('href', '/');
  });
});
