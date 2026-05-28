import { Fragment, useState } from "react";
import roadmapData from "../data/roadmap.json";
import jobRolesData from "../data/jobRoles.json";

type RoadmapStep = { step: number; title: string; desc: string; keywords: string[] };
type JobRole = { role: string; summary: string; doing: string; keywords: string[] };

const roadmap = roadmapData as RoadmapStep[];
const jobRoles = jobRolesData as JobRole[];

type Tab = "roadmap" | "jobs" | "diagram";

const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700";
const chip = "rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200";

// B6: 学ぶ指針（学習ロードマップ・業界職種解説・図解説明）。
export function LearnView() {
  const [tab, setTab] = useState<Tab>("roadmap");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex gap-2" role="tablist" aria-label="学ぶ内容">
        <SubTab active={tab === "roadmap"} onClick={() => setTab("roadmap")}>学習ロードマップ</SubTab>
        <SubTab active={tab === "jobs"} onClick={() => setTab("jobs")}>業界・職種</SubTab>
        <SubTab active={tab === "diagram"} onClick={() => setTab("diagram")}>図解</SubTab>
      </div>

      {tab === "roadmap" && (
        <ol className="flex flex-col gap-3">
          {roadmap.map((s) => (
            <li key={s.step} className={card}>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                  {s.step}
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">{s.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{s.desc}</p>
              {s.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.keywords.map((k) => (
                    <span key={k} className={chip}>{k}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {tab === "jobs" && (
        <ul className="flex flex-col gap-3">
          {jobRoles.map((j) => (
            <li key={j.role} className={card}>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">{j.role}</h2>
              <p className="mt-1 text-sm font-medium text-sky-700 dark:text-sky-400">{j.summary}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{j.doing}</p>
              {j.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {j.keywords.map((k) => (
                    <span key={k} className={chip}>{k}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "diagram" && (
        <div className="flex flex-col gap-5">
          <ClientServerDiagram />
          <RequestFlowDiagram />
          <ThreeTierDiagram />
          <TestTypesDiagram />
          {FLOW_DIAGRAMS.map((f) => (
            <FlowDiagram key={f.title} {...f} />
          ))}
          {COMPARE_DIAGRAMS.map((c) => (
            <CompareDiagram key={c.title} {...c} />
          ))}
        </div>
      )}
    </section>
  );
}

// 図解1：クライアントとサーバー
function ClientServerDiagram() {
  return (
    <figure className={card}>
      <figcaption className="font-bold text-slate-900 dark:text-slate-100">クライアントとサーバー</figcaption>
      <p className="mt-1 mb-3 text-sm text-slate-700 dark:text-slate-300">
        ブラウザ（クライアント）が「ください」と頼み、サーバーが「どうぞ」と返す関係。
      </p>
      <div className="flex items-center justify-center gap-3 text-center text-sm">
        <Box label="ブラウザ" sub="クライアント" />
        <div className="flex flex-col items-center text-xs text-slate-500 dark:text-slate-400">
          <span aria-hidden="true">→ リクエスト</span>
          <span aria-hidden="true">← レスポンス</span>
        </div>
        <Box label="サーバー" sub="データを返す" />
      </div>
    </figure>
  );
}

// 図解2：リクエストが届くまで（DNS→TCP/IP→HTTPS）
function RequestFlowDiagram() {
  return (
    <figure className={card}>
      <figcaption className="font-bold text-slate-900 dark:text-slate-100">ページが表示されるまで</figcaption>
      <p className="mt-1 mb-3 text-sm text-slate-700 dark:text-slate-300">
        名前を住所に変換し（DNS）、確実に届け（TCP/IP）、暗号化して安全にやりとりする（HTTPS）。
      </p>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Step n="1" t="DNS" d="名前→IP" />
        <Arrow />
        <Step n="2" t="TCP/IP" d="確実に届ける" />
        <Arrow />
        <Step n="3" t="HTTPS" d="暗号化" />
        <Arrow />
        <Step n="4" t="表示" d="画面に描画" />
      </ol>
    </figure>
  );
}

// 図解3：3層構造（フロントエンド→バックエンド→データベース）
function ThreeTierDiagram() {
  return (
    <figure className={card}>
      <figcaption className="font-bold text-slate-900 dark:text-slate-100">アプリの3層構造</figcaption>
      <p className="mt-1 mb-3 text-sm text-slate-700 dark:text-slate-300">
        画面・処理・保存で役割を分ける。フロントは見た目、バックは処理とAPI、DBはデータ保存を担う。
      </p>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Step n="1" t="フロントエンド" d="画面・操作" />
        <Arrow />
        <Step n="2" t="バックエンド" d="処理・API" />
        <Arrow />
        <Step n="3" t="データベース" d="データ保存" />
      </ol>
    </figure>
  );
}

// 図解4：テストの種類（単体→結合→E2E）
function TestTypesDiagram() {
  return (
    <figure className={card}>
      <figcaption className="font-bold text-slate-900 dark:text-slate-100">テストの種類</figcaption>
      <p className="mt-1 mb-3 text-sm text-slate-700 dark:text-slate-300">
        小さく速い単体から、つないで確認する結合、ユーザー操作全体のE2Eへ。役割を分けて組み合わせる。
      </p>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Step n="1" t="単体テスト" d="部品が単独で動くか（速い）" />
        <Arrow />
        <Step n="2" t="結合テスト" d="部品やDBの連携を確認" />
        <Arrow />
        <Step n="3" t="E2Eテスト" d="操作全体を実ブラウザで（遅い）" />
      </ol>
    </figure>
  );
}

// 汎用：手順フロー図（ステップを矢印でつなぐ）
type Flow = { title: string; desc: string; steps: { t: string; d: string }[] };

const FLOW_DIAGRAMS: Flow[] = [
  { title: "データの流れ（タスク作成）", desc: "ユーザー操作が保存され、画面に反映されるまでの往復。",
    steps: [{ t: "フロント", d: "操作・入力チェック" }, { t: "バックエンド", d: "検証" }, { t: "データベース", d: "保存" }, { t: "バックエンド", d: "応答" }, { t: "フロント", d: "画面更新" }] },
  { title: "CRUDとHTTPメソッド", desc: "データ操作の4種と、対応するHTTPメソッド。",
    steps: [{ t: "Create", d: "POST 作成" }, { t: "Read", d: "GET 取得" }, { t: "Update", d: "PUT 更新" }, { t: "Delete", d: "DELETE 削除" }] },
  { title: "HTTPステータスコード", desc: "応答結果を3桁の番号で表す。先頭の数字で分類される。",
    steps: [{ t: "2xx", d: "成功" }, { t: "3xx", d: "転送" }, { t: "4xx", d: "クライアント側" }, { t: "5xx", d: "サーバー側" }] },
  { title: "DNSの名前解決", desc: "人が読む名前を、機械が使う住所(IP)に変換する流れ。",
    steps: [{ t: "ドメイン名", d: "例 example.com" }, { t: "DNSへ問合せ", d: "住所を聞く" }, { t: "IPアドレス", d: "住所が返る" }, { t: "サーバー接続", d: "通信開始" }] },
  { title: "JWT（トークン認証）の流れ", desc: "ログイン後、トークンを持ち歩いて本人確認する。",
    steps: [{ t: "ログイン", d: "ID/パスワード" }, { t: "トークン発行", d: "署名付き" }, { t: "保存", d: "ブラウザが保持" }, { t: "以降の通信", d: "トークンで認証" }] },
  { title: "公開鍵暗号方式", desc: "公開鍵で暗号化し、対の秘密鍵だけが復号できる。",
    steps: [{ t: "公開鍵で暗号化", d: "送信者" }, { t: "通信", d: "盗まれても安全" }, { t: "秘密鍵で復号", d: "受信者だけ" }] },
  { title: "ハッシュ化によるパスワード保存", desc: "元に戻せない形に変換して保存し、漏洩被害を抑える。",
    steps: [{ t: "パスワード", d: "入力" }, { t: "ハッシュ関数", d: "一方向変換" }, { t: "保存", d: "元に戻せない" }] },
  { title: "SQLインジェクション対策", desc: "入力値を命令と分離（プレースホルダ）して安全に実行。",
    steps: [{ t: "入力値", d: "悪意の可能性" }, { t: "プレースホルダ", d: "値として分離" }, { t: "安全に実行", d: "注入を防ぐ" }] },
  { title: "CI/CD パイプライン", desc: "変更を自動でビルド・テストし、本番へ届けるまで。",
    steps: [{ t: "コミット", d: "変更を反映" }, { t: "ビルド", d: "成果物作成" }, { t: "自動テスト", d: "品質確認" }, { t: "デプロイ", d: "本番反映" }] },
  { title: "Git と プルリクエスト", desc: "本流に入れる前にレビューを挟むチーム開発の流れ。",
    steps: [{ t: "ブランチ作成", d: "作業用" }, { t: "コミット", d: "変更を記録" }, { t: "プルリク", d: "確認依頼" }, { t: "レビュー", d: "他者が確認" }, { t: "マージ", d: "本流へ" }] },
  { title: "スクラムの1スプリント", desc: "短い期間を繰り返し、少しずつ作って改善する。",
    steps: [{ t: "計画", d: "やることを決める" }, { t: "開発", d: "数週間" }, { t: "レビュー", d: "成果を見せる" }, { t: "振り返り", d: "改善" }] },
  { title: "AWSの基本構成", desc: "役割を分けて、安定して動かす定番の組み合わせ。",
    steps: [{ t: "利用者", d: "ブラウザ" }, { t: "ALB", d: "振り分け" }, { t: "EC2", d: "アプリ実行" }, { t: "RDS", d: "データ保存" }] },
  { title: "AWSのネットワーク（VPC）", desc: "VPCで区画を作り、公開・非公開のサブネットに分けて安全に配置する。",
    steps: [{ t: "VPC", d: "専用ネットワーク" }, { t: "公開サブネット", d: "ALB/EC2" }, { t: "非公開サブネット", d: "RDS" }, { t: "セキュリティグループ", d: "通信を制御" }] },
  { title: "負荷分散（ロードバランシング）", desc: "アクセスを複数サーバーへ振り分け、集中を防ぐ。",
    steps: [{ t: "大量アクセス", d: "利用者" }, { t: "ALB", d: "振り分け" }, { t: "複数のEC2", d: "分担して処理" }] },
  { title: "クラウドの責任範囲", desc: "右にいくほど自分で管理する範囲が減る。",
    steps: [{ t: "オンプレミス", d: "全部自前" }, { t: "IaaS", d: "基盤を借りる" }, { t: "PaaS", d: "実行環境まで" }, { t: "SaaS", d: "完成アプリ" }] },
  { title: "レイヤードアーキテクチャ", desc: "役割ごとに層を分け、責任を分離する。",
    steps: [{ t: "Controller", d: "入出力" }, { t: "Service", d: "業務ロジック" }, { t: "Repository", d: "DBアクセス" }, { t: "Database", d: "保存" }] },
  { title: "N+1問題と解消", desc: "件数分の問い合わせが発生する問題を、まとめて取得で解消。",
    steps: [{ t: "一覧取得", d: "1回" }, { t: "各件取得", d: "N回（遅い）" }, { t: "JOINでまとめる", d: "1回に削減" }] },
  { title: "トランザクション", desc: "複数の処理を一括で扱い、全部成功か全部取り消しにする。",
    steps: [{ t: "処理1", d: "開始" }, { t: "処理2", d: "続行" }, { t: "コミット", d: "全部成功" }, { t: "（失敗時）", d: "全部取り消し" }] },
  { title: "キャッシュの仕組み", desc: "一度取得したものを手元に置き、次回を高速化する。",
    steps: [{ t: "初回", d: "サーバーから取得" }, { t: "保存", d: "キャッシュに置く" }, { t: "2回目", d: "手元から高速表示" }] },
  { title: "正規化", desc: "重複をなくすようにテーブルを分け、整合性を高める。",
    steps: [{ t: "重複の多い表", d: "更新ミスのもと" }, { t: "テーブル分割", d: "重複を排除" }, { t: "整合性向上", d: "管理しやすい" }] },
  { title: "デプロイまでの工程", desc: "作って終わりではなく、確認して本番へ届ける。",
    steps: [{ t: "開発", d: "実装" }, { t: "ビルド", d: "まとめる" }, { t: "テスト", d: "確認" }, { t: "デプロイ", d: "本番公開" }] },
];

// 汎用：2項目を対比する図
type Compare = { title: string; desc: string; left: { label: string; points: string[] }; right: { label: string; points: string[] } };

const COMPARE_DIAGRAMS: Compare[] = [
  { title: "認証 と 認可", desc: "誰かを確かめるのが認証、何を許すかを決めるのが認可。",
    left: { label: "認証（Authentication）", points: ["本人か確かめる", "ログインなど"] }, right: { label: "認可（Authorization）", points: ["何を許すか決める", "権限・アクセス制御"] } },
  { title: "同期 と 非同期", desc: "待つのが同期、待つ間も他を進められるのが非同期。",
    left: { label: "同期処理", points: ["終わるまで待つ", "順番に1つずつ"] }, right: { label: "非同期処理", points: ["待つ間に他を進める", "通信に向く"] } },
  { title: "アジャイル と ウォーターフォール", desc: "少しずつ繰り返すか、最初に全部決めて順に進むか。",
    left: { label: "アジャイル", points: ["短い反復で改善", "変化に強い"] }, right: { label: "ウォーターフォール", points: ["工程を順に進む", "計画重視"] } },
  { title: "SPA と 従来型サイト", desc: "一部だけ書き換えるか、ページごと読み直すか。",
    left: { label: "SPA", points: ["一部だけ更新", "操作が滑らか"] }, right: { label: "従来型", points: ["ページごと読み直し", "都度サーバーへ"] } },
  { title: "スケールアップ と スケールアウト", desc: "1台を強くするか、台数を増やすか。",
    left: { label: "スケールアップ", points: ["1台の性能を上げる", "DB向き"] }, right: { label: "スケールアウト", points: ["台数を増やす", "Webサーバー向き"] } },
  { title: "疎結合 と 密結合", desc: "部品のつながりが緩いほど変更・再利用しやすい。",
    left: { label: "疎結合", points: ["依存が弱い", "変更に強い"] }, right: { label: "密結合", points: ["依存が強い", "変更が波及"] } },
];

function FlowDiagram({ title, desc, steps }: Flow) {
  return (
    <figure className={card}>
      <figcaption className="font-bold text-slate-900 dark:text-slate-100">{title}</figcaption>
      <p className="mt-1 mb-3 text-sm text-slate-700 dark:text-slate-300">{desc}</p>
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        {steps.map((s, i) => (
          <Fragment key={s.t + i}>
            {i > 0 && <Arrow />}
            <Step n={String(i + 1)} t={s.t} d={s.d} />
          </Fragment>
        ))}
      </ol>
    </figure>
  );
}

function CompareDiagram({ title, desc, left, right }: Compare) {
  return (
    <figure className={card}>
      <figcaption className="font-bold text-slate-900 dark:text-slate-100">{title}</figcaption>
      <p className="mt-1 mb-3 text-sm text-slate-700 dark:text-slate-300">{desc}</p>
      <div className="grid grid-cols-2 gap-3">
        {[left, right].map((col) => (
          <div key={col.label} className="rounded-xl border-2 border-sky-300 bg-sky-50 p-3 dark:border-sky-700 dark:bg-sky-950">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{col.label}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600 dark:text-slate-300">
              {col.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </figure>
  );
}

function Box({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3 dark:border-sky-700 dark:bg-sky-950">
      <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300">{sub}</p>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">{n}</span>
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{t}</span>
        <span className="block text-xs text-slate-600 dark:text-slate-300">{d}</span>
      </span>
    </li>
  );
}

function Arrow() {
  return (
    <li aria-hidden="true" className="flex items-center justify-center text-slate-400 dark:text-slate-500">
      <span className="hidden sm:inline">→</span>
      <span className="sm:hidden">↓</span>
    </li>
  );
}

function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        active ? "bg-sky-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
