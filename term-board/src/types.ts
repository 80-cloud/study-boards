// 要件定義書 §8 データモデル設計方針。
// 1用語 → 3モード（4択・暗記カード・面接問答）を導出する DRY な中心型。

export type Term = {
  id: string; // 例 "tcp-ip"
  category: string; // 分野。例 "ネットワーク"
  term: string; // 表示名。例 "TCP/IP"
  meaning: string; // 正しい意味（暗記カード裏／4択の正解）
  distractors: string[]; // 4択の誤答。meaning と混ぜてシャッフルする
  interview: string; // 面接での短い言い方（核の単語＋結論）。Phase2 で使用

  // --- v0.3 拡張（任意・後から段階的に埋める。要件定義書 §8） ---
  // F-TERM-05: 中学生にも分かる超平易な説明。専門用語を専門用語で説明しないための一言。
  // 「噛み砕くが嘘はつかない」を原則に meaning と必ず併記する（§4-5・R-06）。
  plainMeaning?: string;
  // F-TERM-04: 現場での使われ方シーン。実装経験のない未経験者に「どんな場面で出てくるか」の
  // イメージを与え、面接で「使ったことは?」に最低限答えられる素地を作る（§13-1）。
  scene?: string;

  // F-USER-01 / #385: 出所。同梱=builtin / 自作=user / 共有コードで取り込んだ他者作=shared。
  // 未指定は builtin 相当（既存データは無改修）。
  source?: "builtin" | "user" | "shared";

  // B1: 難易度レベル（辞典でのバッジ表示・用語レベル表示）。
  level?: "初級" | "中級" | "上級";

  // 出題範囲を絞るためのタグ（例 ["AWS"]）。分野(category)より細かいまとまりを表す。
  // 同梱語の一部に付与（AWS/Git 等）。自作4択でも入力できる。面接練習の tags と同じ用途。
  tags?: string[];

  // F-INTV-03: 深掘り「なぜ?」チェーン（要件定義書 §13-2）。
  // 面接は1問1答で終わらず重ねてくる。2〜3段の追い質問を段階的に開示し、
  // 連鎖した理解へ引き上げる。4択正解後に QuizView で順に開く。
  followUps?: { q: string; a: string }[];
};

// F-USER-01: ユーザー（経験者＝講師役）が登録する「実際に聞かれた面接質問」。
// 4択ではなく質問→模範回答の形式（誤答選択肢が不要なため未経験者でも書ける）。
export type InterviewQuestion = {
  id: string;
  category: string; // 分野・場面（例 "自己PR" "技術" "逆質問"）
  question: string; // 実際に聞かれた質問（例「アジャイルとは？」「なぜIT業界？」）
  answer: string; // 模範回答／自分の答え
  memo?: string; // 補足（聞かれた状況・コツなど）
  source?: "builtin" | "user" | "shared";

  // B4: 面接コンテンツの強化（任意）。
  tags?: string[]; // 例 ["頻出", "未経験定番"]。面接練習でフィルタに使う
  template?: string; // 回答の型（PREP/STAR 等）のヒント
  ngExample?: string; // ありがちなNG回答＋改善ポイント
  followUps?: { q: string; a: string }[]; // 深掘り「なぜ?」チェーン（面接官の追い質問・F-INTV-03）
};

// F-USER-02: 共有・保存の単位。エクスポート/インポートはこの形をやり取りする。
export type UserContent = {
  quizTerms: Term[]; // ユーザー作問の4択用語
  interviewQuestions: InterviewQuestion[]; // ユーザー作問の面接Q&A
  reverseQuestions?: string[]; // 逆質問（#425・任意フィールドで後方互換）
  flashcards?: Flashcard[]; // 暗記カード（#427・任意フィールドで後方互換）
  portfolioCards?: PortfolioCard[]; // 成果物棚卸し（#456・任意フィールドで後方互換）
};

// F-CARD-01 拡張: ユーザー作問の軽量カード（distractors なし）。
// 4択用語より自由度が高く、略語・コマンド・予約語の暗記に向く。
export type Flashcard = {
  id: string;
  front: string; // 表（用語・問題）
  back: string; // 裏（意味・回答）
  category?: string; // 分野（任意）
  level?: "初級" | "中級" | "上級"; // 学習レベル（#444・未設定はフィルタで全レベル該当）
  source?: "user" | "shared";
};

// #456: 成果物棚卸しテンプレ。面接で「何作りました？」「工夫した点は？」に
// 答えるための素地を、本人が自分の言葉で言語化して保存する。
// AI 自動生成は採用しない（ハルシネーションで本人がいない内容を話す事故を防ぐ）。
export type PortfolioCard = {
  id: string;
  title: string; // 必須: 作ったもの（プロダクト名・概要）
  problem: string; // 必須: 解決したい課題（誰の何を）
  tech: string; // 必須: 使った技術（言語・FW・インフラ等）
  effort: string; // 必須: 工夫した点（自分の判断や試行錯誤）
  difficulty?: string; // 任意: 困った点と乗り越え方
  retrospective?: string; // 任意: もう一度作るならどう変えるか
  githubUrl?: string; // 任意: GitHub URL
  source?: "user" | "shared";
};

// B5: 自己紹介・志望動機の下書き素材（穴埋め式・localStorage保存）。
export type ProfileDraft = {
  selfIntro: {
    name: string; // 名前
    background: string; // 前職・経歴
    learning: string; // 学習中のこと
    work: string; // 制作物・成果
    closing: string; // 意気込み
  };
  motivation: {
    trigger: string; // IT/その仕事に興味を持ったきっかけ
    companyReason: string; // その会社固有の惹かれた点
    action: string; // 学習・制作など起こした行動
    future: string; // 入社後どうしたいか
  };
};

// F-INTV-02 / 要件定義書 §8-3: 学習セッション（学習ログ）。
// 面接練習の「言えた/言えなかった」自己採点1回＝1セッション（asked=1, correct=0|1）として
// 追記する。将来 quiz/card モードのログ集約にも使えるよう mode を持たせている。
export type LearningSession = {
  id: string;
  startedAt: string; // ISO 文字列
  mode: "quiz" | "card" | "interview";
  asked: number; // 出題（自己採点）した数
  correct: number; // 「言えた」と申告した数
};

// 用語ごとの「実力」。termId で Term と結合する（用語の追加・修正が進捗を壊さない）。
export type Progress = {
  [termId: string]: {
    correct: number;
    wrong: number;
    lastAnsweredAt: string; // ISO 文字列
  };
};
