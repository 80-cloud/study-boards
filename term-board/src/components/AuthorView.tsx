import { useState } from "react";
import type { UseUserContent } from "../hooks/useUserContent";

type Props = { user: UseUserContent };
type Tab = "quiz" | "interview" | "share";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400";
const labelClass = "block text-sm font-medium text-slate-700";
const primaryBtn =
  "rounded-xl bg-sky-700 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-300";

// F-USER-01/02: 自分で問題を書く（4択用語・面接Q&A）＋共有（エクスポート/インポート）。
export function AuthorView({ user }: Props) {
  const [tab, setTab] = useState<Tab>("interview");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex gap-2" role="tablist" aria-label="作問の種類">
        <SubTab active={tab === "interview"} onClick={() => setTab("interview")}>
          面接Q&amp;A
        </SubTab>
        <SubTab active={tab === "quiz"} onClick={() => setTab("quiz")}>
          4択用語
        </SubTab>
        <SubTab active={tab === "share"} onClick={() => setTab("share")}>
          共有
        </SubTab>
      </div>

      {tab === "interview" && <InterviewForm user={user} />}
      {tab === "quiz" && <QuizForm user={user} />}
      {tab === "share" && <SharePanel user={user} />}
    </section>
  );
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        active ? "bg-sky-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// --- 面接Q&A 作成フォーム ---
function InterviewForm({ user }: Props) {
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [memo, setMemo] = useState("");
  const valid = category.trim() && question.trim() && answer.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    user.addInterviewQuestion({
      category: category.trim(),
      question: question.trim(),
      answer: answer.trim(),
      memo: memo.trim() || undefined,
    });
    setCategory("");
    setQuestion("");
    setAnswer("");
    setMemo("");
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">
          実際に聞かれた面接の質問と、自分の答え（模範回答）を登録できます。
        </p>
        <div>
          <label htmlFor="iv-cat" className={labelClass}>分野・場面 <span className="text-rose-600">*</span></label>
          <input id="iv-cat" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例：自己PR / 技術 / 逆質問" />
        </div>
        <div>
          <label htmlFor="iv-q" className={labelClass}>質問 <span className="text-rose-600">*</span></label>
          <input id="iv-q" className={inputClass} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例：なぜIT業界を志望したのですか？" />
        </div>
        <div>
          <label htmlFor="iv-a" className={labelClass}>模範回答 <span className="text-rose-600">*</span></label>
          <textarea id="iv-a" className={inputClass} rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="自分の言葉での答え" />
        </div>
        <div>
          <label htmlFor="iv-memo" className={labelClass}>メモ（任意）</label>
          <input id="iv-memo" className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="聞かれた状況・コツなど" />
        </div>
        <div>
          <button type="submit" disabled={!valid} className={primaryBtn}>追加する</button>
        </div>
      </form>

      <ItemList
        title={`登録した面接Q&A（${user.content.interviewQuestions.length}件）`}
        items={user.content.interviewQuestions.map((q) => ({
          id: q.id,
          primary: q.question,
          secondary: `${q.category}｜${q.answer}`,
        }))}
        onRemove={user.removeInterviewQuestion}
      />
    </div>
  );
}

// --- 4択用語 作成フォーム ---
function QuizForm({ user }: Props) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [meaning, setMeaning] = useState("");
  const [d0, setD0] = useState("");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [interview, setInterview] = useState("");
  const [plainMeaning, setPlainMeaning] = useState("");
  const valid =
    term.trim() && category.trim() && meaning.trim() && interview.trim() &&
    d0.trim() && d1.trim() && d2.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    user.addQuizTerm({
      term: term.trim(),
      category: category.trim(),
      meaning: meaning.trim(),
      distractors: [d0.trim(), d1.trim(), d2.trim()],
      interview: interview.trim(),
      plainMeaning: plainMeaning.trim() || undefined,
    });
    setTerm(""); setCategory(""); setMeaning(""); setD0(""); setD1(""); setD2("");
    setInterview(""); setPlainMeaning("");
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">
          4択クイズに出る用語を作れます。誤答の選択肢を3つ用意してください。
        </p>
        <div>
          <label htmlFor="q-term" className={labelClass}>用語 <span className="text-rose-600">*</span></label>
          <input id="q-term" className={inputClass} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="例：REST API" />
        </div>
        <div>
          <label htmlFor="q-cat" className={labelClass}>分野 <span className="text-rose-600">*</span></label>
          <input id="q-cat" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例：開発手法" />
        </div>
        <div>
          <label htmlFor="q-mean" className={labelClass}>正しい意味 <span className="text-rose-600">*</span></label>
          <textarea id="q-mean" className={inputClass} rows={2} value={meaning} onChange={(e) => setMeaning(e.target.value)} />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>誤答の選択肢 <span className="text-rose-600">*</span>（3つ）</legend>
          <input aria-label="誤答1" className={inputClass} value={d0} onChange={(e) => setD0(e.target.value)} placeholder="誤答1" />
          <input aria-label="誤答2" className={inputClass} value={d1} onChange={(e) => setD1(e.target.value)} placeholder="誤答2" />
          <input aria-label="誤答3" className={inputClass} value={d2} onChange={(e) => setD2(e.target.value)} placeholder="誤答3" />
        </fieldset>
        <div>
          <label htmlFor="q-iv" className={labelClass}>面接での言い方 <span className="text-rose-600">*</span></label>
          <textarea id="q-iv" className={inputClass} rows={2} value={interview} onChange={(e) => setInterview(e.target.value)} />
        </div>
        <div>
          <label htmlFor="q-plain" className={labelClass}>かんたんに言うと（任意）</label>
          <input id="q-plain" className={inputClass} value={plainMeaning} onChange={(e) => setPlainMeaning(e.target.value)} placeholder="中学生にも分かる言い方" />
        </div>
        <div>
          <button type="submit" disabled={!valid} className={primaryBtn}>追加する</button>
        </div>
      </form>

      <ItemList
        title={`登録した4択用語（${user.content.quizTerms.length}件）`}
        items={user.content.quizTerms.map((t) => ({
          id: t.id,
          primary: t.term,
          secondary: `${t.category}｜${t.meaning}`,
        }))}
        onRemove={user.removeQuizTerm}
      />
    </div>
  );
}

// --- 共有（エクスポート/インポート） ---
function SharePanel({ user }: Props) {
  const [exported, setExported] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const total = user.content.quizTerms.length + user.content.interviewQuestions.length;

  const doExport = () => {
    if (total === 0) {
      setMessage({ kind: "err", text: "共有できる問題がありません。まず問題を追加してください。" });
      return;
    }
    const code = user.exportCode();
    setExported(code);
    void navigator.clipboard?.writeText(code).catch(() => {});
    setMessage({ kind: "ok", text: "共有コードを生成しました（クリップボードにもコピー）。Discord等に貼って共有できます。" });
  };

  const doImport = () => {
    try {
      const { quiz, interview } = user.importCode(importText);
      setImportText("");
      setMessage({ kind: "ok", text: `取り込みました：4択用語 ${quiz}件／面接Q&A ${interview}件。` });
    } catch {
      setMessage({ kind: "err", text: "共有コードを読み取れませんでした。コードが正しいか確認してください。" });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-bold text-slate-900">書き出す（共有する）</h2>
        <p className="mt-1 text-sm text-slate-600">
          自分が作った問題（4択 {user.content.quizTerms.length}件・面接 {user.content.interviewQuestions.length}件）を
          共有コードにして、Discordなどに貼って渡せます。
        </p>
        <button type="button" onClick={doExport} className={`mt-3 ${primaryBtn}`}>共有コードを作る</button>
        {exported && (
          <textarea readOnly className={`mt-3 ${inputClass} font-mono text-xs`} rows={4} value={exported} aria-label="共有コード" />
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-bold text-slate-900">取り込む（受け取る）</h2>
        <p className="mt-1 text-sm text-slate-600">
          もらった共有コードを貼り付けて取り込むと、自分の問題に追加されます。
        </p>
        <label htmlFor="import-code" className="sr-only">共有コードを貼り付け</label>
        <textarea
          id="import-code"
          className={`mt-3 ${inputClass} font-mono text-xs`}
          rows={4}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="ここに共有コードを貼り付け"
        />
        <button type="button" onClick={doImport} disabled={!importText.trim()} className={`mt-3 ${primaryBtn}`}>取り込む</button>
      </div>

      {message && (
        <p className={`rounded-xl p-3 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

// --- 共通：登録済み一覧（削除つき） ---
function ItemList({
  title,
  items,
  onRemove,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string }[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-center text-sm text-slate-500">まだ登録がありません。</p>;
  }
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{it.primary}</p>
              <p className="truncate text-xs text-slate-500">{it.secondary}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(it.id)}
              className="shrink-0 rounded-lg px-2 py-1 text-sm text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
