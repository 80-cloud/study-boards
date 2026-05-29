import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReviewPrefBadges from './ReviewPrefBadges';

describe('ReviewPrefBadges', () => {
  it('全項目が空のときは何も描画しない（バッジ縦積み防止）', () => {
    const { container } = render(<ReviewPrefBadges />);
    expect(container.firstChild).toBeNull();
  });

  it('tones を日本語ラベルでバッジ表示する', () => {
    render(<ReviewPrefBadges tones={['WELCOME_BEGINNER', 'HARSH_OK']} />);
    expect(screen.getByText(/初学者歓迎/)).toBeInTheDocument();
    expect(screen.getByText(/辛口OK/)).toBeInTheDocument();
  });

  it('aspects と aiUsage を併記する', () => {
    render(
      <ReviewPrefBadges aspects={['SECURITY', 'UI']} aiUsage="PARTIAL" />
    );
    expect(screen.getByText(/セキュリティ/)).toBeInTheDocument();
    expect(screen.getByText(/UI/)).toBeInTheDocument();
    expect(screen.getByText(/AI一部使用/)).toBeInTheDocument();
  });

  it('未知のキーは元の値をそのまま表示（??フォールバック）', () => {
    render(<ReviewPrefBadges tones={['UNKNOWN_TONE']} />);
    expect(screen.getByText(/UNKNOWN_TONE/)).toBeInTheDocument();
  });
});
