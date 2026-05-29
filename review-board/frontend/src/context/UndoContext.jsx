import { createContext, useCallback, useContext, useState } from 'react';
import UndoBar from '../components/UndoBar';

// #496 P5：Undo 状態をアプリ全体で 1 つだけ保持。
// 削除→navigate('/') してもバーが生き残るよう、表示は App 直下にマウントする。
const UndoCtx = createContext({ requestUndo: () => {}, dismissUndo: () => {} });

export function UndoProvider({ children }) {
  // pending: { message, onUndo } | null
  const [pending, setPending] = useState(null);

  // 既存の pending を「後勝ち」で上書きする（同時に複数 Undo を抱えない）。
  const requestUndo = useCallback((message, onUndo) => {
    setPending({ message, onUndo });
  }, []);

  const dismissUndo = useCallback(() => setPending(null), []);

  const handleUndo = async () => {
    if (!pending) return;
    try {
      await pending.onUndo?.();
    } finally {
      setPending(null);
    }
  };

  return (
    <UndoCtx.Provider value={{ requestUndo, dismissUndo }}>
      {children}
      <UndoBar
        open={!!pending}
        message={pending?.message}
        onUndo={handleUndo}
        onDismiss={dismissUndo}
      />
    </UndoCtx.Provider>
  );
}

export function useUndo() {
  return useContext(UndoCtx);
}
