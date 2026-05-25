// review-board 性能テスト（#163・k6）。docs/性能目標.md の P-1 P95 目標を CI で継続検証する。
//
// シナリオ：受講生でログイン → 投稿一覧 → 投稿詳細 → 自分の成長記録を回す。
// しきい値は P-1 の P95 目標（読み取り≤200ms・成長記録≤250ms・ログイン≤600ms）。
// setup() で 1 件投稿を用意し、一覧/詳細が空にならないようにする。
//
// 実行例（ローカル）：
//   BASE_URL=http://localhost:8082 SEED_PASSWORD=devpass12345 k6 run posts-load.js
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8082';
const PASSWORD = __ENV.SEED_PASSWORD || 'devpass12345';
const STUDENT = __ENV.PERF_STUDENT_EMAIL || 'student@example.com';

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: __ENV.DURATION || '30s',
    },
  },
  thresholds: {
    // P-1 の P95 目標（CI 共有ランナーの余裕を見つつ、目標値そのものをガードに使う）。
    'http_req_duration{endpoint:posts_list}': ['p(95)<200'],
    'http_req_duration{endpoint:post_detail}': ['p(95)<200'],
    'http_req_duration{endpoint:profile}': ['p(95)<250'],
    'http_req_duration{endpoint:login}': ['p(95)<600'],
    // 失敗率は 1% 未満（機能不全の早期検知）。
    http_req_failed: ['rate<0.01'],
  },
};

function login(email) {
  const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login' },
  });
  check(res, { 'login 200': (r) => r.status === 200 });
  let userId = null;
  try { userId = res.json('id'); } catch (e) { /* noop */ }
  return userId;
}

// 一覧/詳細が空にならないよう、最低 1 件の投稿を用意する。
export function setup() {
  const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email: STUDENT, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status !== 200) {
    return { seeded: false };
  }
  http.post(`${BASE}/api/posts`, JSON.stringify({
    title: 'perf seed post',
    description: 'k6 性能テスト用のシード投稿です。',
  }), { headers: { 'Content-Type': 'application/json' } });
  return { seeded: true };
}

export default function () {
  // 認証（cookie は VU の jar に保持され、以降の GET に自動付与）。
  const userId = login(STUDENT);

  // 投稿一覧（主役導線）。
  const list = http.get(`${BASE}/api/posts`, { tags: { endpoint: 'posts_list' } });
  check(list, { 'posts 200': (r) => r.status === 200 });

  // 先頭の投稿で詳細を引く（Slice の content[0]）。
  let firstId = null;
  try {
    const content = list.json('content');
    if (content && content.length > 0) firstId = content[0].id;
  } catch (e) { /* noop */ }
  if (firstId) {
    const detail = http.get(`${BASE}/api/posts/${firstId}`, { tags: { endpoint: 'post_detail' } });
    check(detail, { 'detail 200': (r) => r.status === 200 });
  }

  // 自分の成長記録（集約クエリ）。
  if (userId) {
    const profile = http.get(`${BASE}/api/users/${userId}/profile`, { tags: { endpoint: 'profile' } });
    check(profile, { 'profile 200': (r) => r.status === 200 });
  }
}
