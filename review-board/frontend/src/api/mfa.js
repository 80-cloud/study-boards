import client from './client';

// C-6 二要素認証（TOTP・#235）。常に自分のアカウントの MFA を操作する（認証必須）。
export const setupMfa = () => client.post('/auth/mfa/setup').then((r) => r.data); // {secret, qrDataUri}

export const enableMfa = (code) => client.post('/auth/mfa/enable', { code });

export const disableMfa = (code) => client.post('/auth/mfa/disable', { code });
