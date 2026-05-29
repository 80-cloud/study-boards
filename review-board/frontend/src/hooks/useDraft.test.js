import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraft } from './useDraft';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: { id: 42 } });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('未ログイン時は localStorage に触れない（best-effort で no-op）', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const apply = vi.fn();
    const { result } = renderHook(() => useDraft('post-new', apply));
    act(() => result.current.save({ title: 'x' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(localStorage.length).toBe(0);
    expect(apply).not.toHaveBeenCalled();
  });

  it('マウント時に既存の下書きを apply し restored=true にする', () => {
    localStorage.setItem('draft:42:post-new', JSON.stringify({ title: '復元案' }));
    const apply = vi.fn();
    const { result } = renderHook(() => useDraft('post-new', apply));
    expect(apply).toHaveBeenCalledWith({ title: '復元案' });
    expect(result.current.restored).toBe(true);
  });

  it('save は 300ms デバウンス後に localStorage に書き込む', () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useDraft('post-new', apply));
    act(() => result.current.save({ title: 'a' }));
    expect(localStorage.getItem('draft:42:post-new')).toBeNull();
    act(() => vi.advanceTimersByTime(299));
    expect(localStorage.getItem('draft:42:post-new')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(JSON.parse(localStorage.getItem('draft:42:post-new'))).toEqual({ title: 'a' });
  });

  it('連続 save は最後の値だけ保存される（デバウンスの本旨）', () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useDraft('post-new', apply));
    act(() => {
      result.current.save({ title: 'a' });
      result.current.save({ title: 'ab' });
      result.current.save({ title: 'abc' });
    });
    act(() => vi.advanceTimersByTime(300));
    expect(JSON.parse(localStorage.getItem('draft:42:post-new'))).toEqual({ title: 'abc' });
  });

  it('clear は 即時に下書きを消し restored=false に戻す', () => {
    localStorage.setItem('draft:42:post-new', JSON.stringify({ title: 'x' }));
    const apply = vi.fn();
    const { result } = renderHook(() => useDraft('post-new', apply));
    expect(result.current.restored).toBe(true);
    act(() => result.current.clear());
    expect(localStorage.getItem('draft:42:post-new')).toBeNull();
    expect(result.current.restored).toBe(false);
  });

  it('壊れた JSON は無視して破棄する（読み取り例外で落ちない）', () => {
    localStorage.setItem('draft:42:post-new', '{not-json');
    const apply = vi.fn();
    const { result } = renderHook(() => useDraft('post-new', apply));
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.restored).toBe(false);
    expect(localStorage.getItem('draft:42:post-new')).toBeNull();
  });
});
