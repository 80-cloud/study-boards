import { describe, it, expect } from 'vitest';
import { getErrorMessage, STATUS_MESSAGES, NETWORK_MESSAGE, FALLBACK_MESSAGE } from './errorMessages';

describe('getErrorMessage', () => {
  it('null / undefined はフォールバックを返す', () => {
    expect(getErrorMessage(null)).toBe(FALLBACK_MESSAGE);
    expect(getErrorMessage(undefined, '独自のフォールバック')).toBe('独自のフォールバック');
  });

  it('ネットワークエラーは ERR_NETWORK でも message でも検出する', () => {
    expect(getErrorMessage({ code: 'ERR_NETWORK' })).toBe(NETWORK_MESSAGE);
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toBe(NETWORK_MESSAGE);
    expect(getErrorMessage({ message: 'Network Error' })).toBe(NETWORK_MESSAGE);
  });

  it('バックエンドの日本語メッセージを最優先する', () => {
    const err = { response: { status: 400, data: { message: '招待コードが無効です' } } };
    expect(getErrorMessage(err, 'fallback')).toBe('招待コードが無効です');
  });

  it('HTTP ステータスから親切な日本語を返す（401 / 403 / 404 / 413 / 429 / 500）', () => {
    expect(getErrorMessage({ response: { status: 401 } })).toBe(STATUS_MESSAGES[401]);
    expect(getErrorMessage({ response: { status: 403 } })).toBe(STATUS_MESSAGES[403]);
    expect(getErrorMessage({ response: { status: 404 } })).toBe(STATUS_MESSAGES[404]);
    expect(getErrorMessage({ response: { status: 413 } })).toBe(STATUS_MESSAGES[413]);
    expect(getErrorMessage({ response: { status: 429 } })).toBe(STATUS_MESSAGES[429]);
    expect(getErrorMessage({ response: { status: 500 } })).toBe(STATUS_MESSAGES[500]);
  });

  it('未定義の status は fallback を返す', () => {
    expect(getErrorMessage({ response: { status: 418 } }, 'コーヒーは淹れられません'))
      .toBe('コーヒーは淹れられません');
  });

  it('空白のみのバックエンドメッセージは無視して fallback / status に進む', () => {
    const err = { response: { status: 500, data: { message: '   ' } } };
    expect(getErrorMessage(err)).toBe(STATUS_MESSAGES[500]);
  });

  it('全てのメッセージが空でなく、英語の生エラー語を含まない', () => {
    // 「人に優しい」ためのガード：英語の生エラー語（Error / Failed / Validation / failed）が混入しない。
    const forbidden = /Error|Failed|failed|Validation/;
    Object.values(STATUS_MESSAGES).forEach((msg) => {
      expect(msg.length, `"${msg}" が空`).toBeGreaterThan(0);
      expect(forbidden.test(msg), `"${msg}" に英語エラー語が混入`).toBe(false);
    });
    expect(forbidden.test(NETWORK_MESSAGE)).toBe(false);
    expect(forbidden.test(FALLBACK_MESSAGE)).toBe(false);
  });
});
