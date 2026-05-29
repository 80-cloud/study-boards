import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EmptyState from './EmptyState';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('EmptyState', () => {
  it('title と description が描画される', () => {
    wrap(<EmptyState title="まだありません" description="最初の一歩を踏み出そう" />);
    expect(screen.getByText('まだありません')).toBeInTheDocument();
    expect(screen.getByText('最初の一歩を踏み出そう')).toBeInTheDocument();
  });

  it('既定アイコンは 📭、icon prop で差し替え可能', () => {
    const { rerender } = wrap(<EmptyState title="t" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <EmptyState title="t" icon="🔔" />
      </MemoryRouter>
    );
    expect(screen.getByText('🔔')).toBeInTheDocument();
  });

  it('ctaLabel + ctaHref が揃うとリンク CTA を出す', () => {
    wrap(<EmptyState title="t" ctaLabel="最初の投稿" ctaHref="/posts/new" />);
    const link = screen.getByRole('link', { name: '最初の投稿' });
    expect(link).toHaveAttribute('href', '/posts/new');
  });

  it('ctaLabel + ctaOnClick の組み合わせはボタン CTA になりクリックで発火', async () => {
    const onClick = vi.fn();
    wrap(<EmptyState title="t" ctaLabel="リトライ" ctaOnClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'リトライ' });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ctaLabel 無し（href/onClick 不問）のときは CTA を出さない', () => {
    wrap(<EmptyState title="t" description="d" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
