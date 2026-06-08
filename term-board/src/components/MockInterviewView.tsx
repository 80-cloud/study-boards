import { useEffect, useMemo, useRef, useState } from "react";
import type { Term, LearningSession } from "../types";
import { repository } from "../api";
import { pickRandom } from "../utils/shuffle";
import { newId } from "../utils/share";

// F-INTV-04: 模擬面接モード（要件定義書 §13-3）。
// 「質問 → 声に出す/任意入力（30秒で結論）→ 模範解答と並べて自己評価」の1サイクルを回し、
// 場数を踏ませる。自己評価は学習ログ（F-INTV-02）に記録し、studyDays にも効かせる。

const TIMER_SECONDS = 30;

export function MockInterviewView() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [tag, setTag] = useState("");
  const [source, setSource] = useState<"all" | "user" | "builtin">("all");
  const [current, setCurrent] = useState<Term | null>(null);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [sessionAsked, setSessionAsked] = useState(0);
  const [sessionSaid, setSessionSaid] = useState(0);
  // F-INTV-05: 構造採点ルーブリック（結論→理由→具体の3観点）。
  const [rubric, setRubric] = useState({ conclusion: false, reason: false, concrete: false });

  // 30秒タイマー（任意・結論を30秒でまとめる練習）。
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    let active = true;
    repository.getTerms().then((t) => {
      if (!active) return;
      // 面接の言い方（interview）を持つ用語だけを出題対象にする。
      setTerms(t.filter((x) => x.interview && x.interview.trim().length > 0));
    });
    return () => {
      active = false;
      clearTimer();
    };
  }, []);

  const pickNext = (pool: Term[], prev: Term | null) => {
    let picked = pickRandom(pool);
    if (pool.length > 1 && prev) {
      while (picked.id === prev.id) picked = pickRandom(pool);
    }
    return picked;
  };

  // 出題タグ・出どころ（自作のみ/既定のみ）で出題プールを絞る。
  const tags = useMemo(() => [...new Set(terms.flatMap((t) => t.tags ?? []))].sort(), [terms]);
  const pool = useMemo(
    () =>
      terms.filter((t) => {
        if (tag && !(t.tags ?? []).includes(tag)) return false;
        if (source === "user" && t.source !== "user") return false;
        if (source === "builtin" && (t.source ?? "builtin") !== "builtin") return false;
        return true;
      }),
    [terms, tag, source],
  );

  // プールが変わったら、現在の問題がプール外になっていれば出し直す。
  useEffect(() => {
    setCurrent((prev) => {
      if (pool.length === 0) return null;
      if (prev && pool.some((t) => t.id === prev.id)) return prev;
      return pickRandom(pool);
    });
  }, [pool]);

  const startTimer = () => {
    clearTimer();
    setRemaining(TIMER_SECONDS);
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        if (r <= 1) {
          clearTimer();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const reveal = () => {
    clearTimer();
    setRevealed(true);
  };

  // 構造採点ルーブリックのスコア（0〜3）。2観点以上で「言えた」扱い。
  const rubricScore = (rubric.conclusion ? 1 : 0) + (rubric.reason ? 1 : 0) + (rubric.concrete ? 1 : 0);

  // 3観点の自己採点を学習ログへ記録し、次の問題へ。
  const submitAssessment = () => {
    const said = rubricScore >= 2;
    const session: LearningSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      mode: "interview",
      asked: 1,
      correct: said ? 1 : 0,
    };
    void repository.appendLearningSession(session);
    void repository.recordStudyDay(new Date().toLocaleDateString("sv-SE"));
    setSessionAsked((n) => n + 1);
    if (said) setSessionSaid((n) => n + 1);
    // 次の問題へリセット。
    clearTimer();
    setRemaining(null);
    setInput("");
    setRevealed(false);
    setRubric({ conclusion: false, reason: false, concrete: false });
    setCurrent((prev) => (pool.length > 0 ? pickNext(pool, prev) : null));
  };

  const timerLabel = useMemo(() => {
    if (remaining === null) return null;
    if (remaining === 0) return "時間です。結論から話せましたか？";
    return `残り ${remaining} 秒`;
  }, [remaining]);

  if (terms.length === 0) {
    return (
      <p className="text-center text-label-2">
        模擬面接に使える用語がありません。
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-label-2">
          面接官になったつもりで、結論から声に出して説明しましょう。
        </p>
        {sessionAsked > 0 && (
          <p className="text-sm font-medium text-label-2">
            この模擬面接：言えた {sessionSaid} ／ {sessionAsked}
          </p>
        )}
      </div>

      {/* 出題範囲：タグ（AWS 等）・出どころ（自作のみ/既定のみ）で絞る。 */}
      <div className="flex flex-wrap items-center gap-3">
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="mock-tag" className="text-sm font-medium text-label-2">タグ</label>
            <select
              id="mock-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">すべて</option>
              {tags.map((tg) => (<option key={tg} value={tg}>{tg}</option>))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label htmlFor="mock-source" className="text-sm font-medium text-label-2">出どころ</label>
          <select
            id="mock-source"
            value={source}
            onChange={(e) => setSource(e.target.value as "all" | "user" | "builtin")}
            className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="all">すべて</option>
            <option value="user">自作のみ</option>
            <option value="builtin">既定のみ</option>
          </select>
        </div>
      </div>

      {!current ? (
        <p className="text-center text-label-2">この条件（タグ・出どころ）では出題できる用語がありません。</p>
      ) : (
      <>
      {/* 質問 */}
      <div className="hig-card p-6">
        <p className="text-sm font-medium text-accent">{current.category}</p>
        <h2 className="mt-1 text-2xl font-bold text-label">
          「{current.term}」について、面接官に説明してください。
        </h2>
      </div>

      {/* タイマー */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startTimer}
          className="rounded-control bg-fill-quaternary px-4 py-2 text-sm font-semibold text-label transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ⏱ 30秒で結論（タイマー開始）
        </button>
        {timerLabel && (
          <span
            className={`text-sm font-bold ${
              remaining === 0 ? "text-rose-700 dark:text-rose-400" : "text-label"
            }`}
            role="status"
          >
            {timerLabel}
          </span>
        )}
      </div>

      {/* 任意入力（声に出す代わりにメモしてもよい） */}
      <div>
        <label htmlFor="mock-answer" className="text-sm font-medium text-label-2">
          自分の答え（任意・声に出す代わりにメモしても）
        </label>
        <textarea
          id="mock-answer"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="結論 →（理由・具体）の順で…"
          className="mt-1 w-full rounded-control border border-separator bg-surface px-3 py-2 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={reveal}
          className="hig-btn-primary px-5 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          模範解答と比べる
        </button>
      ) : (
        <div className="hig-card p-6">
          <p className="text-sm leading-relaxed text-label-2">
            <span className="font-semibold text-label">模範解答：</span>
            {current.interview}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-label-2">
            <span className="font-semibold text-label">正しい意味：</span>
            {current.meaning}
          </p>
          {input.trim() && (
            <div className="mt-3 rounded-control bg-surface-2 p-3">
              <p className="text-sm leading-relaxed text-label">
                <span className="font-semibold text-label">あなたの答え：</span>
                {input}
              </p>
            </div>
          )}
          {current.followUps && current.followUps.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100 dark:bg-amber-950 dark:ring-amber-900">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">深掘りも想定しておきましょう</p>
              <ul className="mt-1 flex flex-col gap-2">
                {current.followUps.map((f, i) => (
                  <li key={i} className="text-sm leading-relaxed text-label-2">
                    <span className="font-semibold text-label">Q. {f.q}</span>
                    <br />
                    A. {f.a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm font-medium text-label-2">
              自己採点（3観点）<span className="ml-2 font-bold text-accent">{rubricScore} / 3</span>
            </p>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="sr-only">構造採点ルーブリック</legend>
              {([
                ["conclusion", "結論から述べた"],
                ["reason", "理由を説明した"],
                ["concrete", "具体例・現場のイメージを出した"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-label">
                  <input
                    type="checkbox"
                    checked={rubric[key]}
                    onChange={(e) => setRubric((r) => ({ ...r, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-separator text-accent focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={submitAssessment}
              autoFocus
              className="hig-btn-primary mt-1 self-start px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              記録して次へ →
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </section>
  );
}
