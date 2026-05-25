import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初回：Cookie が有効ならログイン状態を復元（/me）。
  useEffect(() => {
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await authApi.login(email, password);
    // C-6（#235）MFA 有効ユーザーはまだログイン未完了（access 無し）。呼び出し側で TOTP を求める。
    if (u?.mfaRequired) return u;
    setUser(u);
    return u;
  }, []);

  // C-6 MFA ログイン2段目：TOTP コードで確定し、ログイン状態にする。
  const completeMfaLogin = useCallback(async (code) => {
    const u = await authApi.loginMfa(code);
    setUser(u);
    return u;
  }, []);

  // F-AUTH-02 招待コードで登録 → そのままログイン状態にする。
  const register = useCallback(async (payload) => {
    const u = await authApi.register(payload);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  // プロフィール更新（アバター等）後にヘッダー表示を最新化するため /me を引き直す。
  const refreshUser = useCallback(async () => {
    const u = await authApi.fetchMe();
    setUser(u);
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, completeMfaLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth は AuthProvider の内側で使うこと');
  return ctx;
}
