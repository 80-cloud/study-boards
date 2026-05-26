import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEngagement, getEngagementTrend } from '../api/insights';
import { useAuth } from '../context/AuthContext';

// 運営ダッシュボード（講師/管理者専用・Issue #275）。
// エンゲージメント指標（#273）と週次トレンドを可視化する。非競争方針：学生には露出しない。
// 真の防御は backend の 403（@PreAuthorize）。本ページの role 分岐は UX 補助。

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
const hrs = (v) => (v == null ? '—' : `${v} 時間`);
const fmtDate = (dt) => (dt ? new Date(dt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '—');

// 閾値で色付け（網羅率<60%・停滞≥1人 は amber で注意喚起）。
function StatCard({ label, value, sub, tone = 'normal' }) {
  const toneCls = tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-xl border ${toneCls} p-4 shadow-sm`}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-navy-700">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

// CSS 製の簡易バー（チャートライブラリは入れない＝バンドル肥大回避）。
function TrendBar({ label, value, max, colorCls }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-right text-xs text-gray-400">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100" role="img" aria-label={`${label} ${value}`}>
        <div className={`h-full rounded ${colorCls}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-6 shrink-0 text-xs font-medium tabular-nums text-gray-600">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOps = user && (user.role === 'TEACHER' || user.role === 'ADMIN');

  useEffect(() => {
    if (!isOps) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [m, t] = await Promise.all([getEngagement(), getEngagementTrend(8)]);
        if (active) {
          setMetrics(m);
          setTrend(t);
        }
      } catch {
        if (active) setError('ダッシュボードの取得に失敗しました。');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOps]);

  if (!isOps) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold text-navy-700">権限がありません</h1>
        <p className="mt-2 text-sm text-gray-500">このページは講師・管理者専用です。</p>
      </main>
    );
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-gray-500">読み込み中…</main>;
  }
  if (error || !metrics) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-rose-600">{error || 'データがありません。'}</main>;
  }

  const { members, posts, reviews, reviewCoverageRate, timeToFirstReview, quality, stagnantMembers } = metrics;
  const trendMax = Math.max(
    1,
    ...(trend?.weeks ?? []).flatMap((w) => [w.newReviews, w.activeReviewers]),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-700">運営ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          cohort の「使われ方」を把握し、停滞メンバーのケアに役立てるための運営限定ビューです。
        </p>
      </header>

      {/* 上段：数値カード */}
      <section aria-label="概況" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="メンバー数（ACTIVE）" value={members.active} sub={`受講生 ${members.students}・講師 ${members.teachers}`} />
        <StatCard
          label="レビュー網羅率"
          value={pct(reviewCoverageRate)}
          sub={`未レビュー ${posts.unreviewed} 件`}
          tone={reviewCoverageRate < 0.6 ? 'warn' : 'normal'}
        />
        <StatCard label="投稿（直近7日 / 総数）" value={`${posts.last7d} / ${posts.total}`} />
        <StatCard label="レビュー（直近7日 / 総数）" value={`${reviews.last7d} / ${reviews.total}`} />
        <StatCard
          label="週次アクティブレビュアー"
          value={metrics.weeklyActiveReviewers}
          sub={`対メンバー比 ${pct(metrics.weeklyActiveReviewerRate)}`}
        />
        <StatCard label="週次アクティブ投稿者" value={metrics.weeklyActivePosters} />
        <StatCard label="初レビューまで（中央値）" value={hrs(timeToFirstReview.medianHours)} sub={`待機 ${timeToFirstReview.awaitingCount} 件`} />
        <StatCard label="ベスト選出 / avg観点 / 🙏率" value={`${quality.bestSelectedCount} / ${quality.avgAspectsPerReview.toFixed(1)} / ${pct(quality.thanksRate)}`} />
      </section>

      {/* 中段：週次トレンド（CSS 製の簡易バー） */}
      <section aria-label="週次トレンド" className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-navy-700">週次トレンド（直近8週）</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-wrblue-500" />レビュー数</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-emerald-400" />アクティブレビュアー</span>
          </div>
          <ul className="space-y-3">
            {(trend?.weeks ?? []).map((w) => (
              <li key={w.weekStart}>
                <div className="mb-1 text-xs font-medium text-gray-400">{fmtDate(w.weekStart)} の週</div>
                <div className="space-y-1">
                  <TrendBar label="レビュー" value={w.newReviews} max={trendMax} colorCls="bg-wrblue-500" />
                  <TrendBar label="レビュアー" value={w.activeReviewers} max={trendMax} colorCls="bg-emerald-400" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 下段：停滞メンバー一覧（ケア対象・支援トーン） */}
      <section aria-label="停滞メンバー" className="mt-8">
        <h2 className="mb-1 text-sm font-bold text-navy-700">
          ケア対象メンバー
          {stagnantMembers.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {stagnantMembers.length} 名
            </span>
          )}
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          直近14日に投稿もレビューも無いメンバーです。声かけや個別フォローの参考にしてください。
        </p>
        {stagnantMembers.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            全員が直近14日に活動しています 🎉
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {stagnantMembers.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-navy-700">{m.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {m.lastActiveAt ? `最終活動から ${m.daysInactive} 日` : 'これまで活動なし'}
                  </div>
                </div>
                <Link
                  to={`/users/${m.userId}/profile`}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-navy-700 hover:text-navy-700"
                >
                  プロフィール
                </Link>
              </li>
            ))}
          </ul>
        )}
        {/* TODO(#175 メール実稼働後)：ここに「リマインド送信」ボタンを追加する（タスク2に依存）。 */}
      </section>
    </main>
  );
}
