import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import Avatar from '../components/Avatar';

// F-NOTIF-01 通知センター（S-03）。新着順に並べ、クリックで既読化＋該当投稿へ遷移。
const MESSAGE = {
  REVIEW_RECEIVED: (n) => `${n.actorDisplayName} さんがあなたの投稿にレビューしました`,
  THANKS_RECEIVED: (n) => `${n.actorDisplayName} さんがあなたのレビューに「ありがとう」を送りました`,
  MENTIONED: (n) => `${n.actorDisplayName} さんがあなたを @ で名指ししました`,
  EVALUATION_RESULT: (n) => `${n.actorDisplayName} さんがあなたの投稿を評価しました`,
  REPLY_RECEIVED: (n) => `${n.actorDisplayName} さんがあなたのレビューに返信しました`,
  RE_REVIEW_REQUESTED: (n) => `${n.actorDisplayName} さんが再レビューを依頼しました`,
  BEST_REVIEW_SELECTED: (n) => `${n.actorDisplayName} さんがあなたのレビューをベストに選びました`,
};

const ICON = {
  THANKS_RECEIVED: '🙏 ',
  MENTIONED: '💬 ',
  REVIEW_RECEIVED: '📝 ',
  EVALUATION_RESULT: '🏅 ',
  REPLY_RECEIVED: '↩️ ',
  RE_REVIEW_REQUESTED: '🔁 ',
  BEST_REVIEW_SELECTED: '⭐ ',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () =>
    fetchNotifications()
      .then(setItems)
      .catch(() => setError('通知の取得に失敗しました'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const open = async (n) => {
    try {
      if (!n.read) await markNotificationRead(n.id);
    } finally {
      if (n.postId) navigate(`/posts/${n.postId}`);
    }
  };

  const readAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  if (loading) return <p className="p-6 text-gray-500">読み込み中…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="mac-h text-2xl">通知</h2>
        {items.some((n) => !n.read) && (
          <button onClick={readAll} className="text-sm font-semibold text-brand-500 hover:underline">すべて既読にする</button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">通知はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => open(n)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-mac-sm transition hover:-translate-y-0.5 hover:shadow-mac ${n.read ? 'border-black/5 bg-white/80' : 'border-brand-500/30 bg-brand-400/10'}`}
              >
                {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" aria-label="未読" />}
                <Avatar url={n.actorAvatarUrl} name={n.actorDisplayName} size="sm" />
                <span className="flex-1 text-sm text-gray-700">
                  {ICON[n.type] ?? '🔔 '}
                  {(MESSAGE[n.type]?.(n)) ?? '新しい通知があります'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
