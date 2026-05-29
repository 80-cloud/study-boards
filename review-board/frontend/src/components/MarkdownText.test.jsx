import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownText from './MarkdownText';

describe('MarkdownText', () => {
  it('children が空のときは何も描画しない（null 返却）', () => {
    const { container } = render(<MarkdownText>{''}</MarkdownText>);
    expect(container.firstChild).toBeNull();
  });

  it('プレーンテキストを段落で描画する', () => {
    render(<MarkdownText>{'hello world'}</MarkdownText>);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('見出し記法を h1 として描画する', () => {
    render(<MarkdownText>{'# 大見出し'}</MarkdownText>);
    expect(screen.getByRole('heading', { name: '大見出し' })).toBeInTheDocument();
  });

  it('インラインコードを <code> として描画する', () => {
    const { container } = render(<MarkdownText>{'use `npm test` to run'}</MarkdownText>);
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent('npm test');
  });

  it('リンクは新規タブ＋noreferrer で描画する（安全側）', () => {
    render(<MarkdownText>{'[公式](https://example.com)'}</MarkdownText>);
    const a = screen.getByRole('link', { name: '公式' });
    expect(a).toHaveAttribute('href', 'https://example.com');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });
});
