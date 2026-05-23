import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// F-DRAFT-01 下書き・自動保存（本人・localStorage 主体・backend なし）。
// 入力をデバウンス保存し、再訪時に復元する。キーはユーザー単位で分離（共有端末でのアカウント間混在防止）。
//
// 使い方:
//   const { restored, hasRestored, save, clear, discard } = useDraft('post-new', form, setForm);
//   - restored:    マウント時に下書きがあれば一度だけ true（復元バナー表示用）
//   - save(values): 値が変わるたび呼ぶ（300ms デバウンスで localStorage へ）
//   - clear():      送信成功時に下書きを消す（バナーも消える）
//   - discard():    ユーザーが「破棄」したとき（下書きを消しフォームを空に戻す側で利用）
const DEBOUNCE_MS = 300;

export function useDraft(name, applyDraft) {
  const { user } = useAuth();
  const storageKey = user ? `draft:${user.id}:${name}` : null;
  const [restored, setRestored] = useState(false);
  const timer = useRef(null);
  const appliedKey = useRef(null);

  // マウント時（ユーザー確定後）に一度だけ復元を試みる。
  useEffect(() => {
    if (!storageKey || appliedKey.current === storageKey) return;
    appliedKey.current = storageKey;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        applyDraft(parsed);
        setRestored(true);
      }
    } catch {
      // 壊れた下書きは無視して捨てる
      localStorage.removeItem(storageKey);
    }
    // applyDraft は呼び出し側で安定化させる（依存に含めない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 値の変更をデバウンスして保存。storageKey 単位で安定参照にする（effect の依存に入れても無限ループしない）。
  const save = useCallback((values) => {
    if (!storageKey) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        // 容量超過等は黙って諦める（下書きは best-effort）
      }
    }, DEBOUNCE_MS);
  }, [storageKey]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (storageKey) localStorage.removeItem(storageKey);
    setRestored(false);
  }, [storageKey]);

  // アンマウント時に保留中の保存タイマーを掃除
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return { restored, save, clear };
}
