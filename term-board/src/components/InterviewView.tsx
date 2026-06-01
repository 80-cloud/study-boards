import { useEffect, useMemo, useState } from "react";
import type { InterviewQuestion, LearningSession } from "../types";
import { repository } from "../api";
import { pickRandom } from "../utils/shuffle";
import { newId } from "../utils/share";
import { FollowUpChain } from "./FollowUpChain";
import bundledQuestions from "../data/interviewQuestions.json";

type Props = {
  // ユーザー作問の面接Q&A（F-USER）。
  userQuestions: InterviewQuestion[];
};

// 同梱の頻出質問（B4・テンプレ/NG例/タグつき）。
const bundled = bundledQuestions as InterviewQuestion[];

// F-INTV-01（面接想定問答）＋ B4（想定質問集・頻出タグ・テンプレ・NG例）＋ F-USER。
// 面接の「問い」に答える練習。用語の口頭説明は「模擬面接」が担うため、ここでは
// 用語からの自動導出（「◯◯とは？」）は行わない（役割分離）。
export function InterviewView({ userQuestions }: Props) {
  const [current, setCurrent] = useState<InterviewQuestion | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tag, setTag] = useState<string>(""); // "" = すべて
  // F-INTV-02: この練習セッションの自己採点カウンタ（言えた / 練習数）。
  const [sessionAsked, setSessionAsked] = useState(0);
  const [sessionSaid, setSessionSaid] = useState(0);

  const allQuestions = useMemo(
    () => [...bundled, ...userQuestions],
    [userQuestions],
  );

  const tags = useMemo(
    () => [...new Set(allQuestions.flatMap((q) => q.tags ?? []))].sort(),
    [allQuestions],
  );

  const pool = useMemo(
    () => (tag ? allQuestions.filter((q) => q.tags?.includes(tag)) : allQuestions),
    [allQuestions, tag],
  );

  // pool が揃ったら／タグ変更で pool 外になったら出題し直す。
  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null);
      return;
    }
    if (current === null || !pool.some((q) => q.id === current.id)) {
      setRevealed(false);
      setCurrent(pickRandom(pool));
    }
  }, [pool, current]);

  const next = () => {
    if (pool.length === 0) return;
    setRevealed(false);
    setCurrent((prev) => {
      let picked = pickRandom(pool);
      if (pool.length > 1 && prev) {
        while (picked.id === prev.id) picked = pickRandom(pool);
      }
      return picked;
    });
  };

  // F-INTV-02: 自己採点（言えた/言えなかった）を学習ログに記録し、次の質問へ進む。
  // 面接練習も studyDays に効くよう、解答時に学習日を記録する。
  const selfAssess = (said: boolean) => {
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
    next();
  };

  if (pool.length === 0) {
    return (
      <p className="text-center text-label-2">
        面接の質問がありません。「マイ問題」で追加できます。
      </p>
    );
  }

  if (!current) return null;

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      {/* ヘッダー：進捗とタグ絞り込み（進め方は左カラムのカードで案内）。 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {sessionAsked > 0 && (
          <p className="text-sm font-medium text-label-2" aria-live="polite">
            この練習：言えた {sessionSaid} ／ {sessionAsked}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="iv-tag" className="text-sm font-medium text-label-2">タグ</label>
            <select
              id="iv-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">すべて</option>
              {tags.map((tg) => (
                <option key={tg} value={tg}>{tg}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 面接対策レイアウト（PC）：左＝面接官の質問＋自分で答える、
          右＝模範解答＋面接官の追い質問。本番の「問われて答える」流れに合わせる。
          モバイルは従来どおり縦積み。 */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        {/* 左：面接官からの質問＋自分のターン */}
        <div className="flex flex-col gap-5">
          <div className="hig-card p-6">
            <p className="text-xs font-semibold text-accent">面接官からの質問</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-label-2">{current.category}</span>
              {current.source === "shared" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  もらった問題
                </span>
              )}
              {current.source === "user" && (
                <span className="rounded-full bg-fill-quaternary px-2 py-0.5 text-xs font-medium text-label">
                  自作
                </span>
              )}
              {current.tags?.map((tg) => (
                <span key={tg} className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                  {tg}
                </span>
              ))}
            </div>
            <h2 className="mt-2 text-2xl font-bold text-label">{current.question}</h2>
          </div>

          {!revealed && (
            <div className="hig-card p-5">
              <p className="text-sm leading-relaxed text-label-2">
                まず<span className="font-semibold text-label">声に出して</span>自分の言葉で答えてみましょう。言い切ってから、模範解答と面接官の追い質問で答え合わせします。
              </p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="hig-btn-primary mt-4 w-full px-5 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                模範回答を見る
              </button>
            </div>
          )}
        </div>

        {/* 右：模範解答＋面接官の追い質問。回答前はPCのみプレースホルダで枠を確保。
            内容は内部スクロール、自己評価は下部に固定（深掘りを開いても常に見える）。 */}
        <div className={`${revealed ? "" : "hidden lg:block"} lg:sticky lg:top-4`}>
          {revealed ? (
            <div className="hig-card flex flex-col p-6 lg:max-h-[calc(100vh-2rem)]">
              <div className="min-h-0 lg:overflow-y-auto">
                <p className="text-xs font-semibold text-accent">模範解答と面接官の追い質問</p>
                <p className="mt-2 text-sm leading-relaxed text-label-2">
                  <span className="font-semibold text-label">模範回答：</span>
                  {current.answer}
                </p>
                {current.template && (
                  <div className="mt-3 rounded-control bg-sky-50 p-3 ring-1 ring-sky-100 dark:bg-sky-950 dark:ring-sky-900">
                    <p className="text-sm leading-relaxed text-label">
                      <span className="font-semibold text-accent">回答の型：</span>
                      {current.template}
                    </p>
                  </div>
                )}
                {current.ngExample && (
                  <div className="mt-2 rounded-control bg-rose-50 p-3 ring-1 ring-rose-100 dark:bg-rose-950 dark:ring-rose-900">
                    <p className="text-sm leading-relaxed text-label">
                      <span className="font-semibold text-rose-700 dark:text-rose-300">NG例と改善：</span>
                      {current.ngExample}
                    </p>
                  </div>
                )}
                {current.memo && (
                  <p className="mt-2 text-sm leading-relaxed text-label-2">
                    <span className="font-semibold text-label">メモ：</span>
                    {current.memo}
                  </p>
                )}
                {/* 深掘り「なぜ?」チェーン（面接官の追い質問）。 */}
                {current.followUps && current.followUps.length > 0 && (
                  <FollowUpChain key={current.id} items={current.followUps} />
                )}
              </div>
              {/* 自己評価は内部スクロール領域の外＝常に下部に固定表示。 */}
              <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-separator pt-4">
                <p className="text-sm font-medium text-label-2">
                  自分の言葉で言えましたか？
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selfAssess(true)}
                    autoFocus
                    className="rounded-control bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-[0.98]"
                  >
                    ◯ 言えた
                  </button>
                  <button
                    type="button"
                    onClick={() => selfAssess(false)}
                    className="rounded-control bg-fill-quaternary px-5 py-2.5 font-semibold text-label transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
                  >
                    △ 言えなかった
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // PC のみ：回答前のプレースホルダ（右カラムの枠を確保し、回答時のガタつきを防ぐ）。
            <div className="hig-card flex min-h-[16rem] items-center justify-center p-6 text-center">
              <p className="text-sm leading-relaxed text-label-3">
                まず声に出して答えてから「模範回答を見る」を押すと、
                <br />
                ここに模範解答と面接官の追い質問が表示されます。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
