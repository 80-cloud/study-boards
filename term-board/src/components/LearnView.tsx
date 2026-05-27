import { useState } from "react";
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
