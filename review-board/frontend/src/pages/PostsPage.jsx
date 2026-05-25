import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import { fetchLandingStats } from '../api/stats';
import { matchAspects, matchTones } from '../constants/reviewPrefs';
import { ROLE_LABEL, APP_NAME } from '../constants';
import Avatar from '../components/Avatar';
import WorksList from '../components/WorksList';

// 案L：スクール土台（ランディング）＋マーケット要素（観点カテゴリ／カード）。
const REASONS = [
  { icon: '🤝', title: '受講生どうしの相互レビュー', body: '読む・読まれる経験で独学では得にくい視点が身につく。' },
  { icon: '🏅', title: '講師の評価と合格バッジ', body: '講師の最終評価。合格は最高の証跡として記録に残る。' },
  { icon: '🌱', title: '積み重なる成長記録', body: '投稿・レビュー・連続活動を可視化。努力が「歩み」に。' },
];
// 観点カテゴリ（クリックで検索語を入れて WORKS を絞る）。
const CATS = [
  { icon: '🎨', label: 'UI / デザイン', q: 'UI' }, { icon: '⚙️', label: 'コード品質', q: 'コード' },
  { icon: '🔒', label: 'セキュリティ', q: 'セキュリティ' }, { icon: '⚡', label: 'パフォーマンス', q: 'パフォーマンス' },
  { icon: '🏗', label: '設計', q: '設計' }, { icon: '🧑‍🏫', label: '講師の課題', q: '講師' },
];

function Eyebrow({ children }) {
  return <p className="mac-eyebrow">{children}</p>;
}
function SectionHeading({ children }) {
  return <h2 className="mac-h mt-1 text-center text-[26px]">{children}</h2>;
}

const scrollToWorks = () => document.getElementById('works')?.scrollIntoView({ behavior: 'smooth' });

// F-POST-03 一覧 ＋ F-SEARCH-01 検索 ＋ F-FILTER-01 絞り込み/並び替え（案L ランディングに内包）。
export default function PostsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [ranking, setRanking] = useState([]);

  // 検索・絞り込み・並び替え。初期 q はヘッダー検索からの URL パラメータを尊重。
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [applied, setApplied] = useState({
    q: searchParams.get('q') ?? '', status: '', unreviewed: false, approved: false, sort: 'newest',
  });

  // ヘッダー検索で ?q= が変わったら反映（同一ページ内遷移）。検索語があれば結果（WORKS）まで誘導。
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? '';
    setQ(urlQ);
    setApplied((p) => ({ ...p, q: urlQ }));
    if (urlQ) {
      // レイアウト確定後にスクロール（ランキング・統計の読み込みでズレないよう少し待つ）。
      const t = setTimeout(scrollToWorks, 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    // キーワードを観点/トーンにも解決して渡す（本文に無くてもタグ一致でヒット）。
    fetchPosts({ ...applied, aspects: matchAspects(applied.q), tones: matchTones(applied.q) })
      .then((slice) => setPosts(slice.content ?? []))
      .catch(() => setError('投稿の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [applied]);

  useEffect(() => {
    fetchLandingStats().then(setStats).catch(() => {});
    // いいね人気ランキング：いいね数順の上位3件。
    fetchPosts({ sort: 'likes' }, 0, 3).then((s) => setRanking(s.content ?? [])).catch(() => {});
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    setApplied((p) => ({ ...p, q }));
    scrollToWorks();
  };
  const setFilter = (patch) => setApplied((p) => ({ ...p, ...patch }));
  const pickCategory = (kw) => { setQ(kw); setApplied((p) => ({ ...p, q: kw })); scrollToWorks(); };

  // #210：統計タイルをクリックで各一覧の専用ページへ遷移（3 つとも同じ作り）。
  // 成果物→/works、合格バッジ→/works?approved=1、レビュー→/reviews（いずれも自 cohort・S軸は backend が担保）。
  const tiles = [
    [stats?.postsCount ?? '—', '成果物', 'みんなの成果物一覧へ', () => navigate('/works')],
    [stats?.reviewsCount ?? '—', 'レビュー', 'みんなのレビュー一覧へ', () => navigate('/reviews')],
    [stats?.approvedBadgesCount ?? '—', '合格バッジ', '合格した成果物の一覧へ', () => navigate('/works?approved=1')],
  ];

  return (
    <main>
      {/* ヒーロー（スクール・ランディング＝明るい土台。案L 準拠） */}
      <section className="bg-gradient-to-b from-[#f4f8ff] to-[#eaf1fb]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-12 lg:grid-cols-2 lg:pt-14">
          <div>
            <span className="inline-block rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
              エンジニアスクールの成長支援コミュニティ
            </span>
            <h1 className="mac-h mt-4 text-[32px] leading-[1.25] sm:text-[40px]">
              レビューこそが<span className="whitespace-nowrap">エンジニアを<span className="text-brand-500">育てる</span></span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              受講生どうし・講師が成果物をレビュー。<br className="hidden sm:block" />その積み重ねが、あなたの「成長の証跡」になります。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/posts/new" className="rounded-xl bg-wrblue-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-wrblue-600">成果物を投稿する</Link>
              <button onClick={scrollToWorks} className="rounded-xl border-2 border-navy-700 px-6 py-3 text-sm font-bold text-navy-700 transition hover:bg-navy-700/5">成果物を見る ›</button>
            </div>
          </div>
          <div className="space-y-4">
            {(stats?.featured ?? []).map((u) => (
              <Link key={u.userId} to={`/users/${u.userId}/profile`}
                className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-mac-sm transition hover:-translate-y-0.5 hover:shadow-mac">
                <Avatar name={u.displayName} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-navy-700">{u.displayName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{ROLE_LABEL[u.role] ?? u.role}</span>
                    <span className="text-brand-500">▶</span>
                    <span className="font-semibold text-gray-700">投稿 {u.postsCount}・レビュー {u.reviewsCount}</span>
                    {u.approved && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">🏅 合格</span>}
                  </div>
                </div>
              </Link>
            ))}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              {tiles.map(([n, l, label, onClick]) => (
                <button key={l} type="button" onClick={onClick} aria-label={label}
                  className="rounded-2xl bg-white p-3 shadow-mac-sm transition hover:-translate-y-0.5 hover:shadow-mac focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                  <div className="text-2xl font-extrabold text-navy-700">{n}</div>
                  <div className="text-xs text-gray-500">{l} ›</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REASON：伸びる3つの理由 */}
      <section id="reason" className="mx-auto max-w-6xl px-6 py-14">
        <Eyebrow>REASON</Eyebrow>
        <SectionHeading>{APP_NAME} で伸びる3つの理由</SectionHeading>
        <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-3">
          {REASONS.map((r, i) => (
            <div key={r.title} className="relative rounded-2xl border border-black/5 bg-white p-6 shadow-mac-sm">
              <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
              <div className="mb-3 text-4xl">{r.icon}</div>
              <h3 className="mb-2 text-[16px] font-bold text-navy-700">{r.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BROWSE：検索＋観点カテゴリ */}
      <section className="bg-[#f6f9fe] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <Eyebrow>BROWSE</Eyebrow>
          <SectionHeading>観点から探す</SectionHeading>
          <form onSubmit={submitSearch} className="mx-auto mt-7 flex max-w-2xl items-center rounded-full bg-white p-1.5 shadow-mac">
            <span className="pl-4 text-gray-400">🔍</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="作品・技術・観点で探す（例：React, API 設計）"
              style={{ outline: 'none' }}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none"
            />
            <button type="submit" className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600">探す</button>
          </form>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {CATS.map((c) => (
              <button key={c.label} onClick={() => pickCategory(c.q)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-mac-sm">
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs font-medium leading-tight text-navy-700">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RANKING：いいね数順の人気成果物トップ3（👍 が基準） */}
      {ranking.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <Eyebrow>RANKING</Eyebrow>
          <SectionHeading>いいね人気ランキング</SectionHeading>
          <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
            {ranking.map((p, i) => {
              const medal = ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;
              return (
                <Link key={p.id} to={`/posts/${p.id}`}
                  className="group relative flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-mac-sm transition hover:-translate-y-1 hover:shadow-mac">
                  <span className="text-3xl leading-none">{medal}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-navy-700">{p.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <Avatar name={p.authorDisplayName ?? ''} size="sm" />
                      <span className="truncate">{p.authorDisplayName ?? '—'}</span>
                    </div>
                  </div>
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-navy-700/[0.06] px-3 py-1 text-sm font-bold text-navy-700">
                    👍 <span className="tabular-nums">{p.likeCount}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* WORKS：成果物一覧（検索/絞り込み/並び替えの機能はここに集約。専用ページ /works と共通部品で共有） */}
      <section id="works" className="mx-auto max-w-6xl px-6 py-14">
        <Eyebrow>WORKS</Eyebrow>
        <SectionHeading>みんなの成果物</SectionHeading>
        <WorksList posts={posts} loading={loading} error={error}
          applied={applied} setFilter={setFilter} onClearQuery={() => pickCategory('')} />
      </section>

      {/* CTA 帯（スクール） */}
      <section className="bg-navy-700 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[26px] font-extrabold leading-tight text-white">まずは成果物を投稿して、<br />レビューを受けてみよう。</h2>
          <p className="mt-3 text-sm text-white/70">レビューし合うほど、あなたの成長が積み上がる。</p>
          {/* 濃紺帯の上なので WR ブルーが埋もれないよう白の細リングで分離する。 */}
          <Link to="/posts/new" className="mt-7 inline-block rounded-xl bg-wrblue-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg ring-1 ring-inset ring-white/30 transition hover:bg-wrblue-600">成果物を投稿する</Link>
        </div>
      </section>
    </main>
  );
}
