import LegalLayout from './LegalLayout';
import { APP_NAME } from '../constants';

// #494 P10：ヘルプ / FAQ。`<details>` でネイティブ折りたたみ（aria-expanded 不要）。
// 既存の LegalLayout を流用しログイン不要で閲覧可能（評価者の「使い方」確認導線）。
function Faq({ q, children }) {
  return (
    <details className="group rounded-xl border border-black/5 bg-white px-4 py-3 transition open:shadow-mac-sm">
      <summary className="cursor-pointer list-none font-semibold text-navy-700 marker:hidden">
        <span className="mr-2 text-brand-500 transition group-open:rotate-90 inline-block">▶</span>
        {q}
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </details>
  );
}

export default function HelpPage() {
  return (
    <LegalLayout title="ヘルプ / FAQ" lastUpdated="2026-05-29">
      <p>
        {APP_NAME} の使い方や、よくあるご質問への回答をまとめています。
        各セクションをクリックすると詳細が開きます。
      </p>

      <div className="space-y-3">
        <Faq q="1. はじめての方へ（3 分で始める）">
          <ol className="ml-5 list-decimal space-y-1">
            <li>講師から招待リンク（`/register?code=...`）を受け取ります。</li>
            <li>リンクを開き、表示名・メールアドレス・パスワードを入力して登録します。</li>
            <li>ログイン後、トップで「成果物を投稿する」または「成果物を見る」から始められます。</li>
          </ol>
          <p className="text-xs text-gray-500">
            体験用には、ログイン画面の「デモで試す」ボタンも利用できます（dev シードが投入されている環境のみ）。
          </p>
        </Faq>

        <Faq q="2. 投稿のしかた">
          <p>ヘッダー右上の「＋ 投稿する」から作成します。</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>タイトル・説明</strong>は必須です。説明はマークダウン記法が使えます。</li>
            <li><strong>リポジトリ URL・デモ URL</strong>は任意。あると講師が動作を確認しやすくなります。</li>
            <li><strong>スクリーンショット</strong>（PNG / JPEG / WebP・5MB まで）も任意。一覧で目を引きます。</li>
            <li><strong>レビュー希望タグ</strong>（トーン・観点・AI 利用）を選ぶと、書き手が方針を合わせやすくなります。</li>
          </ul>
          <p className="text-xs text-gray-500">下書きはブラウザに自動保存され、ページを離れても入力内容は残ります。</p>
        </Faq>

        <Faq q="3. レビューの書きかた（テンプレ + 例）">
          <p>レビューは投稿詳細ページの下部から書けます。型に沿うと書きやすいです：</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>✅ 良かった点</strong>（必須）：自分なりに「ここは盗みたい」と思った具体箇所</li>
            <li><strong>💡 もっと良くなる点</strong>（必須）：人格ではなく成果物の改善余地を、できれば「次の一歩」つきで</li>
            <li><strong>観点別コメント</strong>（任意）：可読性・性能・テスト・設計など 4 軸で個別に</li>
          </ul>
          <p>例：「README に動作スクショがあったので、初見でも実装範囲がすぐ掴めました（良）。一覧 API の N+1 が気になったので、`@EntityGraph` で 1 クエリに寄せると更に良さそうです（改善）」</p>
        </Faq>

        <Faq q="4. 多軸評価のしくみ">
          <p>
            投稿には複数の観点（可読性 / 設計 / テスト など）でレビューが付きます。
            講師は最終評価として <strong>合格 / 差し戻し</strong> をつけます。
            合格は <strong>合格バッジ</strong> としてプロフィールに残り、再評価で剥奪されません。
          </p>
          <p>「投稿の質」だけでなく「レビューの質」も評価対象です。良いレビューには「ありがとう」を送れます。</p>
        </Faq>

        <Faq q="5. 招待コードの使い方（講師向け）">
          <p>講師は「招待」ページから招待リンクを発行できます：</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>利用上限</strong>（人数）と <strong>有効日数</strong> を指定して発行</li>
            <li>発行直後の 1 度だけ生コードが表示されるので、その場で受講生に共有してください</li>
            <li>不要になった招待は「失効させる」で即時無効化できます</li>
          </ul>
        </Faq>

        <Faq q="6. パスワードを忘れたとき">
          <p>
            ログイン画面の「パスワードをお忘れですか？」から、登録メールアドレスを入力すると
            再設定リンクが届きます。リンクの有効期限が切れた場合は、再度リクエストしてください。
          </p>
        </Faq>

        <Faq q="7. 通知設定の変更">
          <p>
            プロフィールページの「通知設定」から、メール通知の種別ごとに ON / OFF を切り替えられます。
            通知センターはヘッダーのベルアイコン（🔔）から開けます。未読件数はバッジで表示されます。
          </p>
        </Faq>

        <Faq q="8. アカウントの削除">
          <p>
            プロフィールページ下部の「退会する」から削除できます。退会すると、あなたが書いた投稿・レビューは
            匿名化されて履歴は残りますが、ログイン情報・メールアドレス・プロフィールは復元できません。
          </p>
          <p className="text-xs text-gray-500">講師・管理者の場合は、cohort の運用引き継ぎが必要なため事前に管理者へご相談ください。</p>
        </Faq>

        <Faq q="9. お問い合わせ">
          <p>
            本サービスは学習目的のため、運用窓口は提供していません。
            運用上の問題があれば、所属スクールの担当講師にご相談ください。
          </p>
          <p className="text-xs text-gray-500">バグや改善提案は GitHub Issues に投稿いただけます（リポジトリにアクセス権がある方）。</p>
        </Faq>
      </div>
    </LegalLayout>
  );
}
