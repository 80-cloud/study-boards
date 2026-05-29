import { useEffect, useState, useCallback } from 'react';
import { createInvite, fetchInvites, revokeInvite } from '../api/invites';
import { fetchMembers, disableMember, enableMember } from '../api/members';
import { ROLE_LABEL } from '../constants';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { getErrorMessage } from '../lib/errorMessages';

// 招待コード管理（講師/管理者・Issue #165）。発行→受講生に共有→失効まで。
// 生コードは発行直後の 1 度しか表示できないため、発行時に共有リンクを目立たせる。
const STATUS_LABEL = {
  ACTIVE: { text: '有効', cls: 'bg-emerald-50 text-emerald-700' },
  EXPIRED: { text: '期限切れ', cls: 'bg-gray-100 text-gray-500' },
  USED_UP: { text: '上限到達', cls: 'bg-gray-100 text-gray-500' },
  REVOKED: { text: '失効済み', cls: 'bg-rose-50 text-rose-600' },
};

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export default function InvitesPage() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [maxUses, setMaxUses] = useState(30);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [issued, setIssued] = useState(null); // 発行直後の生コード（1 度だけ）
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, mem] = await Promise.all([fetchInvites(), fetchMembers()]);
      setInvites(inv);
      setMembers(mem);
    } catch (e) {
      setError(getErrorMessage(e, '一覧を読み込めませんでした。少し待ってからもう一度お試しください'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shareLink = (code) => `${window.location.origin}/register?code=${encodeURIComponent(code)}`;

  const onIssue = async () => {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      const inv = await createInvite({ maxUses: Number(maxUses), expiresInDays: Number(expiresInDays) });
      setIssued(inv);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, '招待の発行に失敗しました。少し待ってからもう一度お試しください'));
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(shareLink(issued.rawCode));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const onRevoke = async (id) => {
    setError('');
    try {
      await revokeInvite(id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, '失効に失敗しました。少し待ってからもう一度お試しください'));
    }
  };

  // #229 メンバーの無効化/有効化（kick）。失敗時はメッセージのみ。
  const onToggleMember = async (m) => {
    const disabling = m.status === 'ACTIVE';
    if (disabling && !window.confirm(`${m.displayName} さんを無効化しますか？（ログインできなくなります）`)) {
      return;
    }
    setError('');
    try {
      const updated = disabling ? await disableMember(m.id) : await enableMember(m.id);
      setMembers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(getErrorMessage(e, disabling
        ? '無効化に失敗しました（権限・対象をご確認ください）'
        : '有効化に失敗しました。少し待ってからもう一度お試しください'));
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <p className="mac-eyebrow text-left">INVITE</p>
      <h2 className="mac-h mb-1 text-2xl">受講生を招待</h2>
      <p className="mb-5 text-sm text-gray-500">招待リンクを受講生に共有すると、各自でアカウント登録できます（あなたの期に参加）。</p>

      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* 発行フォーム */}
      <div className="mac-card mb-5 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="inv-max" className="mac-label">利用上限（人数）</label>
            <input id="inv-max" type="number" min={1} max={500} value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)} className="mac-input w-32" />
          </div>
          <div>
            <label htmlFor="inv-days" className="mac-label">有効日数</label>
            <input id="inv-days" type="number" min={1} max={90} value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)} className="mac-input w-32" />
          </div>
          <button onClick={onIssue} disabled={busy} className="mac-btn-brand">
            {busy ? '発行中…' : '招待リンクを発行'}
          </button>
        </div>

        {issued && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <p className="mb-1 text-sm font-semibold text-navy-700">招待リンクを発行しました（この画面でのみ表示）</p>
            <p className="mb-2 text-xs text-gray-500">このリンクを受講生に共有してください。上限 {issued.maxUses} 名・{fmt(issued.expiresAt)} まで有効。</p>
            <div className="flex items-center gap-2">
              <input readOnly value={shareLink(issued.rawCode)}
                className="mac-input flex-1 font-mono text-xs" aria-label="招待リンク" />
              <button onClick={onCopy} className="mac-btn-navy whitespace-nowrap px-4 py-2 text-sm">
                {copied ? 'コピー済み ✓' : 'コピー'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 一覧 */}
      <h3 className="mac-h mb-3 text-lg">発行済みの招待</h3>
      {loading ? (
        <p className="py-8 text-center text-gray-400">読み込み中…</p>
      ) : invites.length === 0 ? (
        <EmptyState
          icon="✉️"
          title="まだ招待はありません"
          description="招待コードを発行して、受講生を cohort に招きましょう。"
        />
      ) : (
        <ul className="space-y-2">
          {invites.map((inv) => {
            const s = STATUS_LABEL[inv.status] ?? STATUS_LABEL.EXPIRED;
            return (
              <li key={inv.id} className="mac-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="text-sm">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.text}</span>
                  <span className="text-gray-700">利用 {inv.currentUses}/{inv.maxUses}</span>
                  <span className="ml-3 text-xs text-gray-400">期限 {fmt(inv.expiresAt)}</span>
                </div>
                {inv.status === 'ACTIVE' && (
                  <button onClick={() => onRevoke(inv.id)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
                    失効させる
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* #229 メンバー管理（無効化/有効化） */}
      <h3 className="mac-h mb-3 mt-8 text-lg">メンバー管理</h3>
      <p className="mb-3 text-sm text-gray-500">無効化すると、その受講生はログインできなくなります（再有効化で復帰）。</p>
      {loading ? (
        <p className="py-8 text-center text-gray-400">読み込み中…</p>
      ) : members.length === 0 ? (
        <p className="py-8 text-center text-gray-400">メンバーがいません。</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => {
            const disabled = m.status === 'DISABLED';
            return (
              <li key={m.id} className="mac-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={m.displayName} size="sm" />
                  <div className="text-sm">
                    <span className="font-semibold text-navy-700">{m.displayName}</span>
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{ROLE_LABEL[m.role] ?? m.role}</span>
                    {disabled && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">無効</span>}
                    <div className="text-xs text-gray-400">{m.email}</div>
                  </div>
                </div>
                {/* 受講生のみ操作可（講師/管理者の行はボタンを出さない＝backend も 403/400 で防御） */}
                {m.role === 'STUDENT' && (
                  <button onClick={() => onToggleMember(m)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      disabled
                        ? 'border-black/10 bg-white text-navy-700 hover:bg-black/[0.03]'
                        : 'border-black/10 bg-white text-rose-600 hover:bg-rose-50'}`}>
                    {disabled ? '有効化する' : '無効化する'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
