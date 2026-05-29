import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('intentional');
}

describe('ErrorBoundary', () => {
  let errorSpy;

  beforeEach(() => {
    // boundary 動作確認時の console.error / componentDidCatch のノイズを抑える。
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('例外が起きなければ children をそのまま描画する', () => {
    render(
      <ErrorBoundary>
        <p>正常</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('children が throw した場合はフォールバック UI を出す', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/予期しないエラー/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
  });

  it('「再読み込み」ボタンで window.location.reload が呼ばれる', async () => {
    const reload = vi.fn();
    // jsdom の location は read-only プロパティが多いため defineProperty で差し替える。
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    await userEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
