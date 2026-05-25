import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import { matchAspects, matchTones } from '../constants/reviewPrefs';
import WorksList from '../components/WorksList';

// #210 成果物の専用一覧ページ。トップの統計タイル「成果物」/「合格バッジ」からの導線。
// ?approved=1 で合格作品のみ（最新評価 APPROVED）に絞った状態で開く。S軸＝自 cohort のみ（backend が担保）。
export default function WorksPage() {
  const [searchParams] = useSearchParams();
  const approvedOnly = searchParams.get('approved') === '1';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [applied, setApplied] = useState({
    q: '', status: '', unreviewed: false, approved: approvedOnly, sort: 'newest',
  });

  // URL の ?approved= が変わったら絞り込み状態へ反映（タイルから合格/全件を行き来できるように）。
  useEffect(() => {
    setApplied((p) => ({ ...p, approved: approvedOnly }));
  }, [approvedOnly]);

  useEffect(() => {
    setLoading(true);
    // キーワードを観点/トーンにも解決して渡す（本文に無くてもタグ一致でヒット。ランディングと同挙動）。
    fetchPosts({ ...applied, aspects: matchAspects(applied.q), tones: matchTones(applied.q) })
      .then((slice) => setPosts(slice.content ?? []))
      .catch(() => setError('投稿の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [applied]);

  const setFilter = (patch) => setApplied((p) => ({ ...p, ...patch }));
  const submitSearch = (e) => {
    e.preventDefault();
    setApplied((p) => ({ ...p, q }));
  };
  const clearQuery = () => { setQ(''); setApplied((p) => ({ ...p, q: '' })); };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="mac-eyebrow">WORKS</p>
      <h1 className="mac-h mt-1 text-[26px]">{applied.approved ? '🏅 合格した成果物' : 'みんなの成果物'}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {applied.approved
          ? '講師の最終評価で合格した成果物の一覧です。'
          : '同じ期（cohort）のみんなの成果物の一覧です。観点・募集状態で絞り込めます。'}
      </p>

      <form onSubmit={submitSearch} className="mt-6 flex max-w-2xl items-center rounded-full bg-white p-1.5 shadow-mac-sm ring-1 ring-black/5">
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

      <WorksList posts={posts} loading={loading} error={error}
        applied={applied} setFilter={setFilter} onClearQuery={clearQuery} />
    </main>
  );
}
