import client from './client';

// C-6 二要素認証（TOTP・#235）。常に自分のアカウントの MFA を操作する（認証必須）。
export const setupMfa = () => client.post('/auth/mfa/setup').then((r) => r.data); // {qrDataUri}

// #241 有効化はリカバリコード（生）を1度だけ返す。{ recoveryCodes: [...] }
export const enableMfa = (code) => client.post('/auth/mfa/enable', { code }).then((r) => r.data);

export const disableMfa = (code) => client.post('/auth/mfa/disable', { code });

// #241 リカバリコード残数。{ remaining, lowThreshold }
export const getRecoveryStatus = () =>
  client.get('/auth/mfa/recovery-codes').then((r) => r.data);

// #241 リカバリコード再生成（現 TOTP コードで本人確認）。{ recoveryCodes: [...] }
export const regenerateRecoveryCodes = (code) =>
  client.post('/auth/mfa/recovery-codes/regenerate', { code }).then((r) => r.data);
