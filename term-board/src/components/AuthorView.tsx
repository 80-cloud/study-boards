import { useState } from "react";
import type { UseUserContent } from "../hooks/useUserContent";
import { ReverseQuestionStock } from "./ReverseQuestionStock";

type Props = { user: UseUserContent };
type Tab = "quiz" | "interview" | "card" | "reverse" | "portfolio" | "share";

const inputClass =
  "w-full rounded-control border border-separator bg-surface px-3 py-2 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const labelClass = "block text-sm font-medium text-label-2";
const primaryBtn =
  "hig-btn-primary px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";
const secondaryBtn =
  "rounded-control bg-fill-quaternary px-5 py-2.5 font-semibold text-label transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

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
        <SubTab active={tab === "card"} onClick={() => setTab("card")}>
          暗記カード
        </SubTab>
        <SubTab active={tab === "reverse"} onClick={() => setTab("reverse")}>
          逆質問
        </SubTab>
        <SubTab active={tab === "portfolio"} onClick={() => setTab("portfolio")}>
          成果物
        </SubTab>
        <SubTab active={tab === "share"} onClick={() => setTab("share")}>
          共有
        </SubTab>
      </div>

      {tab === "interview" && <InterviewForm user={user} />}
      {tab === "quiz" && <QuizForm user={user} />}
      {tab === "card" && <FlashcardForm user={user} />}
      {tab === "reverse" && <ReverseQuestionStock user={user} />}
      {tab === "portfolio" && <PortfolioForm user={user} />}
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
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? "bg-accent-fill text-white" : "bg-surface text-label-2 ring-1 ring-separator hover:text-label"
      }`}
    >
      {children}
    </button>
  );
}

// --- 面接Q&A 作成フォーム（追加＋編集・#389／解説集トピック相当のリッチ入力・#429） ---
function InterviewForm({ user }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [memo, setMemo] = useState("");
  // #429: 解説集（GuideView）でリッチ表示される任意フィールド。
  const [template, setTemplate] = useState("");
  const [ngExample, setNgExample] = useState("");
  const [tagsInput, setTagsInput] = useState(""); // カンマ区切り入力
  const valid = category.trim() && question.trim() && answer.trim();
  const isEditing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setCategory("");
    setQuestion("");
    setAnswer("");
    setMemo("");
    setTemplate("");
    setNgExample("");
    setTagsInput("");
  };

  const startEdit = (id: string) => {
    const item = user.content.interviewQuestions.find((q) => q.id === id);
    if (!item) return;
    setEditingId(id);
    setCategory(item.category);
    setQuestion(item.question);
    setAnswer(item.answer);
    setMemo(item.memo ?? "");
    setTemplate(item.template ?? "");
    setNgExample(item.ngExample ?? "");
    setTagsInput((item.tags ?? []).join(", "));
  };

  // #397: 既に同じ質問が登録済みかどうか（編集中は自分自身を除外）。
  const trimmedQ = question.trim();
  const isDuplicate =
    !!trimmedQ &&
    user.content.interviewQuestions.some(
      (q) => q.question.trim() === trimmedQ && q.id !== editingId,
    );

  // カンマ区切りの入力をタグ配列に正規化（trim・空除去・重複除去）。
  const parseTags = (s: string): string[] | undefined => {
    const list = s
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    const uniq = [...new Set(list)];
    return uniq.length > 0 ? uniq : undefined;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || isDuplicate) return;
    const data = {
      category: category.trim(),
      question: question.trim(),
      answer: answer.trim(),
      memo: memo.trim() || undefined,
      template: template.trim() || undefined,
      ngExample: ngExample.trim() || undefined,
      tags: parseTags(tagsInput),
    };
    if (editingId) {
      user.updateInterviewQuestion(editingId, data);
    } else {
      user.addInterviewQuestion(data);
    }
    resetForm();
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3 hig-card p-5">
        {isEditing && (
          <p className="rounded-control bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900">
            編集中：{question || "（タイトル未入力）"}
          </p>
        )}
        {isDuplicate && (
          <p role="alert" className="rounded-control bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900">
            同じ質問が既に登録されています。重複登録は抑止しました。
          </p>
        )}
        <p className="text-sm text-label-2">
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
        {/* 解説集トピック相当のリッチフィールド（#429）。すべて任意。 */}
        <details className="rounded-control border border-separator p-3 open:bg-fill-quaternary">
          <summary className="cursor-pointer text-sm font-medium text-label-2">
            解説集向け（任意）：回答の型・NG例・タグ
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="iv-template" className={labelClass}>回答の型（PREP / STAR など）</label>
              <textarea
                id="iv-template"
                className={inputClass}
                rows={2}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="例：PREP（要点→理由→具体例→要点）"
              />
            </div>
            <div>
              <label htmlFor="iv-ng" className={labelClass}>NG例と改善</label>
              <textarea
                id="iv-ng"
                className={inputClass}
                rows={2}
                value={ngExample}
                onChange={(e) => setNgExample(e.target.value)}
                placeholder="例：NG「特になし」→ 改善「『3か月後の役割』を聞く」"
              />
            </div>
            <div>
              <label htmlFor="iv-tags" className={labelClass}>頻出タグ（カンマ区切り）</label>
              <input
                id="iv-tags"
                className={inputClass}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例：頻出, 未経験定番, STAR"
              />
            </div>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!valid || isDuplicate} className={primaryBtn}>
            {isEditing ? "更新する" : "追加する"}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm} className={secondaryBtn}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      <ItemList
        title={`登録した面接Q&A（${user.content.interviewQuestions.length}件）`}
        items={user.content.interviewQuestions.map((q) => ({
          id: q.id,
          primary: q.question,
          secondary: `${q.category}｜${q.answer}`,
        }))}
        onEdit={startEdit}
        onRemove={(id) => {
          if (editingId === id) resetForm();
          user.removeInterviewQuestion(id);
        }}
      />
    </div>
  );
}

// --- 4択用語 作成フォーム（追加＋編集・#389） ---
function QuizForm({ user }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [meaning, setMeaning] = useState("");
  const [d0, setD0] = useState("");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [interview, setInterview] = useState("");
  const [plainMeaning, setPlainMeaning] = useState("");
  // 深掘り（面接官の追い質問・任意）。最大2つまで入力可。
  const [fu1q, setFu1q] = useState("");
  const [fu1a, setFu1a] = useState("");
  const [fu2q, setFu2q] = useState("");
  const [fu2a, setFu2a] = useState("");
  const valid =
    term.trim() && category.trim() && meaning.trim() && interview.trim() &&
    d0.trim() && d1.trim() && d2.trim();
  const isEditing = editingId !== null;

  const resetForm = () => {
    setEditingId(null);
    setTerm(""); setCategory(""); setMeaning(""); setD0(""); setD1(""); setD2("");
    setInterview(""); setPlainMeaning("");
    setFu1q(""); setFu1a(""); setFu2q(""); setFu2a("");
  };

  const startEdit = (id: string) => {
    const item = user.content.quizTerms.find((t) => t.id === id);
    if (!item) return;
    setEditingId(id);
    setTerm(item.term);
    setCategory(item.category);
    setMeaning(item.meaning);
    setD0(item.distractors[0] ?? "");
    setD1(item.distractors[1] ?? "");
    setD2(item.distractors[2] ?? "");
    setInterview(item.interview);
    setPlainMeaning(item.plainMeaning ?? "");
    setFu1q(item.followUps?.[0]?.q ?? "");
    setFu1a(item.followUps?.[0]?.a ?? "");
    setFu2q(item.followUps?.[1]?.q ?? "");
    setFu2a(item.followUps?.[1]?.a ?? "");
  };

  // #397: 既に同じ用語名（自作分）が登録済みかどうか（編集中は自分自身を除外）。
  const trimmedT = term.trim();
  const isDuplicate =
    !!trimmedT &&
    user.content.quizTerms.some(
      (t) => t.term.trim() === trimmedT && t.id !== editingId,
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || isDuplicate) return;
    // 深掘り：Q/A 両方が埋まっているペアだけ採用（任意）。
    const followUps = [
      { q: fu1q.trim(), a: fu1a.trim() },
      { q: fu2q.trim(), a: fu2a.trim() },
    ].filter((p) => p.q && p.a);
    const data = {
      term: term.trim(),
      category: category.trim(),
      meaning: meaning.trim(),
      distractors: [d0.trim(), d1.trim(), d2.trim()],
      interview: interview.trim(),
      plainMeaning: plainMeaning.trim() || undefined,
      followUps: followUps.length > 0 ? followUps : undefined,
    };
    if (editingId) {
      user.updateQuizTerm(editingId, data);
    } else {
      user.addQuizTerm(data);
    }
    resetForm();
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3 hig-card p-5">
        {isEditing && (
          <p className="rounded-control bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900">
            編集中：{term || "（用語未入力）"}
          </p>
        )}
        {isDuplicate && (
          <p role="alert" className="rounded-control bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900">
            同じ用語が既に登録されています。重複登録は抑止しました。
          </p>
        )}
        <p className="text-sm text-label-2">
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
        {/* 深掘り「面接ではこう重ねられます」（任意）。正解後に段階開示される追い質問。 */}
        <details className="rounded-control border border-separator p-3 open:bg-fill-quaternary">
          <summary className="cursor-pointer text-sm font-medium text-label-2">
            深掘り（任意）：面接官の追い質問（最大2つ）
          </summary>
          <p className="mt-2 text-xs text-label-3">
            正解後に「答えを見る」で段階表示されます。Q（追い質問）とA（答え方）の両方を書いたペアだけ登録されます。
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="q-fu1q" className={labelClass}>追い質問1（Q）</label>
              <input id="q-fu1q" className={inputClass} value={fu1q} onChange={(e) => setFu1q(e.target.value)} placeholder="例：具体的には何ですか？" />
              <label htmlFor="q-fu1a" className={`${labelClass} mt-2`}>答え方1（A）</label>
              <textarea id="q-fu1a" className={inputClass} rows={2} value={fu1a} onChange={(e) => setFu1a(e.target.value)} placeholder="核を突いてやさしく完結（新しい用語を持ち込みすぎない）" />
            </div>
            <div>
              <label htmlFor="q-fu2q" className={labelClass}>追い質問2（Q）</label>
              <input id="q-fu2q" className={inputClass} value={fu2q} onChange={(e) => setFu2q(e.target.value)} placeholder="例：他とどう違いますか？" />
              <label htmlFor="q-fu2a" className={`${labelClass} mt-2`}>答え方2（A）</label>
              <textarea id="q-fu2a" className={inputClass} rows={2} value={fu2a} onChange={(e) => setFu2a(e.target.value)} placeholder="（任意）2つ目の追い質問の答え方" />
            </div>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!valid || isDuplicate} className={primaryBtn}>
            {isEditing ? "更新する" : "追加する"}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm} className={secondaryBtn}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      <ItemList
        title={`登録した4択用語（${user.content.quizTerms.length}件）`}
        items={user.content.quizTerms.map((t) => ({
          id: t.id,
          primary: t.term,
          secondary: `${t.category}｜${t.meaning}`,
        }))}
        onEdit={startEdit}
        onRemove={(id) => {
          if (editingId === id) resetForm();
          user.removeQuizTerm(id);
        }}
      />
    </div>
  );
}

// --- 暗記カード 作成フォーム（追加＋編集・#427） ---
function FlashcardForm({ user }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<"" | "初級" | "中級" | "上級">("");
  const valid = front.trim() && back.trim();
  const isEditing = editingId !== null;
  const cards = user.content.flashcards ?? [];

  const resetForm = () => {
    setEditingId(null);
    setFront("");
    setBack("");
    setCategory("");
    setLevel("");
  };

  const startEdit = (id: string) => {
    const item = cards.find((c) => c.id === id);
    if (!item) return;
    setEditingId(id);
    setFront(item.front);
    setBack(item.back);
    setCategory(item.category ?? "");
    setLevel(item.level ?? "");
  };

  // 重複チェック（表が同じ・編集中は自分を除外）
  const trimmedF = front.trim();
  const isDuplicate =
    !!trimmedF && cards.some((c) => c.front.trim() === trimmedF && c.id !== editingId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || isDuplicate) return;
    const data = {
      front: front.trim(),
      back: back.trim(),
      category: category.trim() || undefined,
      level: level === "" ? undefined : level,
    };
    if (editingId) {
      user.updateFlashcard(editingId, data);
    } else {
      user.addFlashcard(data);
    }
    resetForm();
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3 hig-card p-5">
        {isEditing && (
          <p className="rounded-control bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900">
            編集中：{front || "（表未入力）"}
          </p>
        )}
        {isDuplicate && (
          <p role="alert" className="rounded-control bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900">
            同じ表のカードが既に登録されています。重複登録は抑止しました。
          </p>
        )}
        <p className="text-sm text-label-2">
          表（用語など）と裏（意味・回答）だけの軽い暗記カードを作れます。略語・コマンド・予約語の暗記に向いています。
        </p>
        <div>
          <label htmlFor="fc-front" className={labelClass}>表 <span className="text-rose-600">*</span></label>
          <input id="fc-front" className={inputClass} value={front} onChange={(e) => setFront(e.target.value)} placeholder="例：DRY" />
        </div>
        <div>
          <label htmlFor="fc-back" className={labelClass}>裏 <span className="text-rose-600">*</span></label>
          <textarea id="fc-back" className={inputClass} rows={3} value={back} onChange={(e) => setBack(e.target.value)} placeholder="例：Don't Repeat Yourself（同じことを繰り返さない）" />
        </div>
        <div>
          <label htmlFor="fc-cat" className={labelClass}>分野（任意）</label>
          <input id="fc-cat" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例：略語 / コマンド" />
        </div>
        <div>
          <label htmlFor="fc-level" className={labelClass}>レベル（任意）</label>
          <select
            id="fc-level"
            className={inputClass}
            value={level}
            onChange={(e) => setLevel(e.target.value as "" | "初級" | "中級" | "上級")}
          >
            <option value="">未設定（どのレベルでも表示）</option>
            <option value="初級">初級</option>
            <option value="中級">中級</option>
            <option value="上級">上級</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!valid || isDuplicate} className={primaryBtn}>
            {isEditing ? "更新する" : "追加する"}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm} className={secondaryBtn}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      <ItemList
        title={`登録した暗記カード（${cards.length}件）`}
        items={cards.map((c) => ({
          id: c.id,
          primary: c.front,
          secondary: `${c.category ?? "暗記カード"}｜${c.back}`,
        }))}
        onEdit={startEdit}
        onRemove={(id) => {
          if (editingId === id) resetForm();
          user.removeFlashcard(id);
        }}
      />
    </div>
  );
}

// --- 成果物棚卸しテンプレ（追加＋編集・#456） ---
// 面接の「何作りました？」「工夫した点は？」に本人の言葉で答えられるよう、
// 制作物を1件1カードで記録する。AI 生成は不採用（ハルシネーション防止）。
function PortfolioForm({ user }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [tech, setTech] = useState("");
  const [effort, setEffort] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [retrospective, setRetrospective] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [optionalOpen, setOptionalOpen] = useState(false);
  const valid = title.trim() && problem.trim() && tech.trim() && effort.trim();
  const isEditing = editingId !== null;
  const cards = user.content.portfolioCards ?? [];

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setProblem("");
    setTech("");
    setEffort("");
    setDifficulty("");
    setRetrospective("");
    setGithubUrl("");
    setOptionalOpen(false);
  };

  const startEdit = (id: string) => {
    const item = cards.find((c) => c.id === id);
    if (!item) return;
    setEditingId(id);
    setTitle(item.title);
    setProblem(item.problem);
    setTech(item.tech);
    setEffort(item.effort);
    setDifficulty(item.difficulty ?? "");
    setRetrospective(item.retrospective ?? "");
    setGithubUrl(item.githubUrl ?? "");
    setOptionalOpen(!!(item.difficulty || item.retrospective || item.githubUrl));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const data = {
      title: title.trim(),
      problem: problem.trim(),
      tech: tech.trim(),
      effort: effort.trim(),
      difficulty: difficulty.trim() || undefined,
      retrospective: retrospective.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
    };
    if (editingId) {
      user.updatePortfolioCard(editingId, data);
    } else {
      user.addPortfolioCard(data);
    }
    resetForm();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-control bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-900">
        <p className="font-semibold">この機能は何のため？</p>
        <p className="mt-1">
          面接で「何作りました？」「工夫した点は？」と聞かれた時に、ここで書いたカードを見ながら自分の言葉で答えられる状態を目指します。
          AI に書いてもらうのではなく、<strong>自分で書く</strong>ことが面接で再現できる素地になります。
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 hig-card p-5">
        {isEditing && (
          <p className="rounded-control bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900">
            編集中：{title || "（タイトル未入力）"}
          </p>
        )}
        <div>
          <label htmlFor="pf-title" className={labelClass}>作ったもの <span className="text-rose-600">*</span></label>
          <input id="pf-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：タスク管理アプリ（Web）" />
        </div>
        <div>
          <label htmlFor="pf-problem" className={labelClass}>解決したい課題 <span className="text-rose-600">*</span></label>
          <textarea id="pf-problem" className={inputClass} rows={2} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="例：複数アプリにメモが散らばって締切を見落とすことを解消したい" />
        </div>
        <div>
          <label htmlFor="pf-tech" className={labelClass}>使った技術 <span className="text-rose-600">*</span></label>
          <input id="pf-tech" className={inputClass} value={tech} onChange={(e) => setTech(e.target.value)} placeholder="例：React, TypeScript, Vite, GitHub Pages" />
        </div>
        <div>
          <label htmlFor="pf-effort" className={labelClass}>工夫した点 <span className="text-rose-600">*</span></label>
          <textarea id="pf-effort" className={inputClass} rows={3} value={effort} onChange={(e) => setEffort(e.target.value)} placeholder="例：localStorage で永続化するか DB を使うか迷い、無料運用のため前者を選んだ。理由は…" />
        </div>

        <button
          type="button"
          onClick={() => setOptionalOpen(!optionalOpen)}
          className="self-start text-sm text-accent underline-offset-2 hover:underline"
        >
          {optionalOpen ? "▾ 任意項目を閉じる" : "▸ 任意項目を開く（困った点・振り返り・GitHub URL）"}
        </button>

        {optionalOpen && (
          <div className="flex flex-col gap-3 rounded-control bg-fill-quaternary p-3">
            <div>
              <label htmlFor="pf-difficulty" className={labelClass}>困った点と乗り越え方</label>
              <textarea id="pf-difficulty" className={inputClass} rows={3} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="例：CORS エラーが解消できず、Vite のプロキシ設定で乗り越えた" />
            </div>
            <div>
              <label htmlFor="pf-retro" className={labelClass}>もう一度作るならどう変える</label>
              <textarea id="pf-retro" className={inputClass} rows={2} value={retrospective} onChange={(e) => setRetrospective(e.target.value)} placeholder="例：状態管理を Context ではなく Zustand にすると見通しが良くなりそう" />
            </div>
            <div>
              <label htmlFor="pf-url" className={labelClass}>GitHub URL</label>
              <input id="pf-url" className={inputClass} value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/your-name/your-repo" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!valid} className={primaryBtn}>
            {isEditing ? "更新する" : "追加する"}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm} className={secondaryBtn}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      <ItemList
        title={`登録した成果物（${cards.length}件）`}
        items={cards.map((c) => ({
          id: c.id,
          primary: c.title,
          secondary: `${c.tech}｜${c.problem}`,
        }))}
        onEdit={startEdit}
        onRemove={(id) => {
          if (editingId === id) resetForm();
          user.removePortfolioCard(id);
        }}
      />
    </div>
  );
}

// --- 共有（エクスポート/インポート） ---
function SharePanel({ user }: Props) {
  const [exported, setExported] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const reverseCount = user.content.reverseQuestions?.length ?? 0;
  const flashcardCount = user.content.flashcards?.length ?? 0;
  const portfolioCount = user.content.portfolioCards?.length ?? 0;
  const total =
    user.content.quizTerms.length +
    user.content.interviewQuestions.length +
    reverseCount +
    flashcardCount +
    portfolioCount;

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
      const { quiz, interview, reverse, flashcard, portfolio } = user.importCode(importText);
      setImportText("");
      setMessage({
        kind: "ok",
        text: `取り込みました：4択用語 ${quiz}件／面接Q&A ${interview}件／暗記カード ${flashcard}件／逆質問 ${reverse}件／成果物 ${portfolio}件。`,
      });
    } catch {
      setMessage({ kind: "err", text: "共有コードを読み取れませんでした。コードが正しいか確認してください。" });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="hig-card p-5">
        <h2 className="font-bold text-label">書き出す（共有する）</h2>
        <p className="mt-1 text-sm text-label-2">
          自分が作った問題（4択 {user.content.quizTerms.length}件・面接 {user.content.interviewQuestions.length}件・暗記カード {flashcardCount}件・逆質問 {reverseCount}件・成果物 {portfolioCount}件）を
          共有コードにして、Discordなどに貼って渡せます。
        </p>
        <button type="button" onClick={doExport} className={`mt-3 ${primaryBtn}`}>共有コードを作る</button>
        {exported && (
          <textarea readOnly className={`mt-3 ${inputClass} font-mono text-xs`} rows={4} value={exported} aria-label="共有コード" />
        )}
      </div>

      <div className="hig-card p-5">
        <h2 className="font-bold text-label">取り込む（受け取る）</h2>
        <p className="mt-1 text-sm text-label-2">
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
        <p className={`rounded-xl p-3 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

// --- 共通：登録済み一覧（編集＋削除・#389） ---
function ItemList({
  title,
  items,
  onEdit,
  onRemove,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string }[];
  onEdit?: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-center text-sm text-label-2">まだ登録がありません。</p>;
  }
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-label">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id} className="hig-card flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-label">{it.primary}</p>
              <p className="truncate text-xs text-label-2">{it.secondary}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(it.id)}
                  aria-label={`「${it.primary}」を編集`}
                  className="rounded-control px-2 py-1 text-sm font-medium text-accent ring-1 ring-separator transition hover:bg-fill-quaternary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  編集
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(it.id)}
                aria-label={`「${it.primary}」を削除`}
                className="rounded-control px-2 py-1 text-sm text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-300 dark:ring-rose-800 dark:hover:bg-rose-950"
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
