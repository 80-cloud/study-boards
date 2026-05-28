import { useState } from "react";
import { useProfileDraft } from "../hooks/useProfileDraft";

type Tab = "selfIntro" | "motivation";

const inputClass =
  "w-full rounded-control border border-separator bg-surface px-3 py-2 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const labelClass = "block text-sm font-medium text-label-2";
const card = "hig-card p-5";

// B5: 自己紹介作成・志望動機整理。穴埋め → 下書き生成 → コピー。保存は自動（localStorage）。
export function PrepView() {
  const { draft, setSelfIntro, setMotivation } = useProfileDraft();
  const [tab, setTab] = useState<Tab>("selfIntro");
  const [copied, setCopied] = useState(false);

  const si = draft.selfIntro;
  const mo = draft.motivation;

  const selfIntroText = [
    si.name && `${si.name}と申します。`,
    si.background && `これまで${si.background}。`,
    si.learning && `現在は${si.learning}を学んでいます。`,
    si.work && `${si.work}を制作しました。`,
    si.closing || "本日はよろしくお願いいたします。",
  ]
    .filter(Boolean)
    .join("");

  const motivationText = [
    mo.trigger && `${mo.trigger}をきっかけにIT業界に興味を持ちました。`,
    mo.companyReason && `御社の${mo.companyReason}に特に魅力を感じています。`,
    mo.action && `実際に${mo.action}という行動を起こしてきました。`,
    mo.future && `入社後は${mo.future}と考えています。`,
  ]
    .filter(Boolean)
    .join("");

  const generated = tab === "selfIntro" ? selfIntroText : motivationText;

  const copy = () => {
    void navigator.clipboard?.writeText(generated).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex gap-2" role="tablist" aria-label="作成する種類">
        <SubTab active={tab === "selfIntro"} onClick={() => setTab("selfIntro")}>自己紹介</SubTab>
        <SubTab active={tab === "motivation"} onClick={() => setTab("motivation")}>志望動機</SubTab>
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <p className="text-sm text-label-2">
          項目を埋めると下書きが組み上がります。入力は自動保存されます。
        </p>
        {tab === "selfIntro" ? (
          <>
            <Field id="si-name" label="名前" value={si.name} onChange={(v) => setSelfIntro("name", v)} placeholder="例：山田 太郎" />
            <Field id="si-bg" label="前職・経歴" value={si.background} onChange={(v) => setSelfIntro("background", v)} placeholder="例：接客業で5年勤務" />
            <Field id="si-learn" label="学習中のこと" value={si.learning} onChange={(v) => setSelfIntro("learning", v)} placeholder="例：HTML/CSS/JavaScript" />
            <Field id="si-work" label="制作物・成果" value={si.work} onChange={(v) => setSelfIntro("work", v)} placeholder="例：簡単なタスク管理アプリ" />
            <Field id="si-close" label="意気込み（任意）" value={si.closing} onChange={(v) => setSelfIntro("closing", v)} placeholder="例：学んだことを言語化して伝えられるよう努めています" />
          </>
        ) : (
          <>
            <Field id="mo-trig" label="きっかけ" value={mo.trigger} onChange={(v) => setMotivation("trigger", v)} placeholder="例：前職の業務改善で効率化の効果を実感したこと" />
            <Field id="mo-comp" label="その会社の惹かれた点" value={mo.companyReason} onChange={(v) => setMotivation("companyReason", v)} placeholder="例：未経験者の育成体制と〇〇事業" />
            <Field id="mo-act" label="起こした行動" value={mo.action} onChange={(v) => setMotivation("action", v)} placeholder="例：独学でWebアプリを制作した" />
            <Field id="mo-fut" label="入社後どうしたいか" value={mo.future} onChange={(v) => setMotivation("future", v)} placeholder="例：早く戦力になり〇〇の開発に貢献したい" />
          </>
        )}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-label">下書き</h2>
          <button
            type="button"
            onClick={copy}
            disabled={!generated}
            className="rounded-control px-3 py-1 text-sm font-medium text-accent ring-1 ring-separator transition hover:bg-fill-quaternary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:text-label-3"
          >
            {copied ? "コピーしました" : "コピー"}
          </button>
        </div>
        <p className="mt-2 min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-label">
          {generated || "上の項目を入力すると、ここに下書きが表示されます。"}
        </p>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? "bg-accent-fill text-white" : "bg-surface text-label-2 ring-1 ring-separator hover:text-label"
      }`}
    >
      {children}
    </button>
  );
}
