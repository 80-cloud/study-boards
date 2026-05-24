// プレビュー用：投稿された「WEB アプリのトップページ」を実スクショ風に描いたミニ画面。
// 本実装では post.screenshotUrl（アップロード済みスクショ）を <img> 表示に置き換える。
// ここでは種別ごとに“それっぽい本物のサイト”を縮小描画し、撮影したスクショのように見せる。

function Todo() {
  const items = [['UI を整える', true], ['Firestore ルール見直し', true], ['テストを書く', false], ['デプロイ設定', false]];
  return (
    <div className="h-full bg-white px-2.5 py-2 text-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-bold">✓ My Tasks</span>
        <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[7px] font-semibold text-white">＋ 追加</span>
      </div>
      <div className="space-y-1.5">
        {items.map(([t, done]) => (
          <div key={t} className="flex items-center gap-1.5 rounded bg-gray-50 px-1.5 py-1">
            <span className={`flex h-2.5 w-2.5 items-center justify-center rounded-[3px] text-[6px] text-white ${done ? 'bg-sky-500' : 'border border-gray-300'}`}>{done ? '✓' : ''}</span>
            <span className={`text-[7.5px] ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Portfolio() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-2.5 py-1.5">
        <span className="text-[8px] font-bold text-gray-900">SORA.dev</span>
        <span className="flex gap-1.5 text-[6.5px] text-gray-500"><span>Works</span><span>About</span><span>Contact</span></span>
      </div>
      <div className="bg-gradient-to-br from-rose-50 to-pink-100 px-2.5 py-2.5">
        <div className="text-[10px] font-extrabold leading-tight text-gray-900">Web Developer</div>
        <div className="mt-0.5 text-[6.5px] text-gray-500">作品を通して学んでいます</div>
        <span className="mt-1.5 inline-block rounded-full bg-rose-500 px-2 py-0.5 text-[6.5px] font-semibold text-white">View Works</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1 p-1.5">
        {['from-sky-200 to-sky-300', 'from-amber-200 to-orange-300', 'from-violet-200 to-purple-300'].map((g) => (
          <span key={g} className={`rounded bg-gradient-to-br ${g}`} />
        ))}
      </div>
    </div>
  );
}

function Api() {
  const lines = [
    [['@RestController', '#c792ea']],
    [['@RequestMapping(', '#82aaff'], ['"/api/posts"', '#c3e88d'], [')', '#82aaff']],
    [['public class ', '#89ddff'], ['PostController', '#ffcb6b'], [' {', '#89ddff']],
    [['  @GetMapping', '#c792ea']],
    [['  List<Post> ', '#89ddff'], ['list', '#82aaff'], ['() {', '#89ddff']],
    [['    return ', '#c792ea'], ['service', '#f07178'], ['.findAll();', '#a6accd']],
    [['  }', '#89ddff']],
  ];
  return (
    <div className="h-full bg-slate-800 px-2 py-1.5 font-mono">
      {lines.map((tokens, i) => (
        <div key={i} className="flex items-center gap-1 leading-[1.35]">
          <span className="w-2 text-right text-[6px] text-slate-600">{i + 1}</span>
          <span className="text-[7px]" style={{ whiteSpace: 'pre' }}>
            {tokens.map(([t, c], j) => <span key={j} style={{ color: c }}>{t}</span>)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Weather() {
  const days = [['月', '24°'], ['火', '22°'], ['水', '19°'], ['木', '26°']];
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-400 to-sky-200 px-2.5 py-2 text-white">
      <div className="text-[8px] font-semibold">東京</div>
      <div className="flex items-center gap-1">
        <span className="text-[26px] font-light leading-none">23°</span>
        <span className="text-2xl">☀️</span>
      </div>
      <div className="text-[6.5px] opacity-90">晴れ・降水確率 10%</div>
      <div className="mt-auto flex justify-between rounded-lg bg-white/20 px-2 py-1">
        {days.map(([d, t]) => (
          <span key={d} className="flex flex-col items-center text-[6.5px]"><span>{d}</span><span className="font-semibold">{t}</span></span>
        ))}
      </div>
    </div>
  );
}

function Chat() {
  const msgs = [['A', '高橋', 'おはようございます！', false], ['そ', '田中', '再接続の実装できた？', true], ['A', '高橋', 'テスト中です👍', false]];
  return (
    <div className="flex h-full bg-white">
      <div className="flex w-1/3 flex-col gap-1 bg-slate-800 px-1.5 py-1.5 text-white">
        <span className="text-[7px] font-bold">review-board</span>
        <span className="rounded bg-white/15 px-1 text-[6.5px]"># general</span>
        <span className="px-1 text-[6.5px] text-slate-300"># random</span>
        <span className="px-1 text-[6.5px] text-slate-300"># dev</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-2 py-1.5">
        {msgs.map(([ini, name, text, me], i) => (
          <div key={i} className="flex items-start gap-1">
            <span className={`flex h-3 w-3 items-center justify-center rounded-full text-[5px] text-white ${me ? 'bg-sky-500' : 'bg-emerald-500'}`}>{ini}</span>
            <div><div className="text-[6px] font-semibold text-gray-700">{name}</div><div className="text-[6.5px] text-gray-600">{text}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="flex h-full flex-col bg-white px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold text-gray-900">家計簿</span>
        <span className="text-[6.5px] text-gray-400">2026年5月</span>
      </div>
      <div className="mt-1 flex gap-1.5">
        <div className="flex-1 rounded bg-fuchsia-50 px-1.5 py-1"><div className="text-[6px] text-gray-500">支出</div><div className="text-[8px] font-bold text-fuchsia-600">¥82,400</div></div>
        <div className="flex-1 rounded bg-emerald-50 px-1.5 py-1"><div className="text-[6px] text-gray-500">残高</div><div className="text-[8px] font-bold text-emerald-600">¥41,600</div></div>
      </div>
      <div className="mt-auto flex items-end gap-1 pt-1">
        {[45, 70, 35, 85, 55, 60, 40].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-fuchsia-400 to-purple-400" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

const SCREENS = { todo: Todo, portfolio: Portfolio, api: Api, weather: Weather, chat: Chat, dashboard: Dashboard };

export default function AppShot({ kind, className = '' }) {
  const Screen = SCREENS[kind] || (() => <div className="h-full bg-gray-100" />);
  return (
    <div className={`flex h-full flex-col overflow-hidden bg-white ${className}`}>
      {/* ブラウザ枠（撮影したスクショ風） */}
      <div className="flex items-center gap-1 bg-gray-200/80 px-1.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        <span className="ml-1 flex h-2.5 flex-1 items-center rounded-full bg-white/90 px-1.5 text-[5.5px] text-gray-400">https://app.example.com</span>
      </div>
      <div className="min-h-0 flex-1"><Screen /></div>
    </div>
  );
}
