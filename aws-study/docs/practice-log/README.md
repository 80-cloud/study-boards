# AWS公式チュートリアル実践記録

AWS公式ドキュメントのチュートリアルをコンソール中心で実践した記録。手順をなぞるだけでなく、公式ドキュメントの記述と実機の挙動が食い違った箇所や、そこから得られた知見を中心にまとめる。検証にはAWS CLI(読み取り専用コマンド)を都度併用し、コンソール操作の結果を実機で裏取りしている。

---

## 1. VPC Reachability Analyzer

**参照**: [Getting started with Reachability Analyzer](https://docs.aws.amazon.com/vpc/latest/reachability/getting-started.html)

VPCの設定(ルートテーブル・セキュリティグループ・NACL等)を静的に解析し、送信元から宛先への通信が到達可能かどうか、到達不可の場合はどのコンポーネントが原因かを判定するサービス。

### やったこと

1. セキュリティグループ(インバウンドルールなし)とネットワークインターフェース(ENI単体・EC2インスタンス未接続)を作成
2. インターネットゲートウェイ→ENI(TCP 80)のパス分析を実行 → **到達不可能**。原因コード`ENI_SG_RULES_MISMATCH`(セキュリティグループのインバウンドルール欠如)が正しく特定された
3. セキュリティグループにHTTP(TCP 80・0.0.0.0/0)のインバウンドルールを追加し再分析 → 予想に反して**到達不可能のまま**。原因コードが`IGW_PRIVATE_IP_ASSOCIATION_FOR_INGRESS`に変化していた
4. 原因を調査した結果、**ネットワークインターフェースは単体でも送信元/宛先として選択できるが、インターネットゲートウェイからの着信を受けるには実際に何か(EC2インスタンス等)にアタッチされ機能している状態である必要がある**という制約に行き当たった。単体ENIのままではセキュリティグループを直しても到達可能にはならない
5. 最小構成のEC2インスタンス(t3.micro)を起動し、そのインスタンスのENIを宛先に切り替えて再分析 → **到達可能**に変化したことを確認
6. 追加したインバウンドルールを再度削除し、再分析 → **到達不可能**に戻ることを確認(許可→遮断の両方向の変化を検知できることを確認)
7. 使用したリソース(パス・EC2インスタンス・ENI・セキュリティグループ)を全て削除し、AWS CLIで削除完了を確認

### 得られた知見

- 公式ドキュメントのリソースタイプ一覧では「ネットワークインターフェース」は「EC2インスタンス」と並列の独立した選択肢として記載されているが、これは「選択できる」ことを意味するだけで、「インターネットゲートウェイ経由の着信を受けられる」ことまでは保証していない。ドキュメントの記載だけでは分からない制約を実機で確認できた
- 原因コード(`ExplanationCode`)を手がかりに、経路上のどのコンポーネント(IGW→NACL→セキュリティグループ→ENI)で止まっているかを機械的に切り分けられることを確認した

---

## 2. VPC Flow Logs × Amazon Athena

**参照**: [Query Amazon VPC flow logs](https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs.html)、[Create a table for Amazon VPC flow logs and query it](https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-create-table-statement.html)

VPC Flow LogsをS3に配信し、Athenaで直接SQLクエリをかけられるようにする。公式には「VPCコンソールでCloudFormationテンプレートを自動生成する方式」と「Athenaコンソールで手動にテーブルを作る方式」の2通りが示されており、後者(手動方式)を選択した。

### やったこと

1. VPCにFlow Logを作成(S3配信・デフォルトログフォーマット・日単位パーティション)。あわせて最小構成のEC2インスタンスを起動し、トラフィックを発生させた
2. S3への配信が反映されるまで数分〜10分程度の遅延があることを確認(即座には配信されない)
3. Athenaで`CREATE EXTERNAL TABLE`を実行し、S3上のログをテーブルとして登録
4. `ALTER TABLE ... ADD PARTITION`でパーティションを追加 — **`CREATE TABLE`だけではクエリ結果が常に0件のままであり、パーティション追加が独立した必須ステップであることを実機で確認した**
5. `SELECT`で実データを取得(100件)。DDLで定義した14カラムがログの実データと正しく対応していることを確認
6. `action = 'REJECT' AND protocol = 6`で絞り込むクエリを実行した結果、**わずか15〜20分の間に100件以上の拒否されたTCP接続試行**が、世界中のバラバラな送信元IPアドレスから記録されていることを確認した。全て同じ宛先(起動したインスタンス)宛で、パブリックIPを持つだけで発生する無差別スキャン的な通信の実態を実データで観測できた
7. 使用したリソース(Athenaテーブル・Flow Log・EC2インスタンス・S3バケット2つ)を全て削除し、AWS CLIで削除完了を確認。あわせてCloudTrailの標準イベント履歴を使い、削除対象以外のリソースに影響が及んでいないことも突き合わせて確認した

### 得られた知見

- 手動方式は、CloudFormation自動生成方式と違い「テーブル定義」と「パーティションへのデータ割り当て」が別々のステップになっており、後者を飛ばすと一見成功して見えても実データにアクセスできない状態になる
- `ROW FORMAT DELIMITED`は単純な位置区切りのため、DDLのカラム数・順序とログの実データのフィールド構成が一致していないと値がずれる。フローログの作成時に選んだログフォーマット(今回はデフォルトの14フィールド)と、DDLのカラム定義を必ず一致させる必要がある
- セキュリティグループでインバウンドを絞ることの効果を、実際に飛んでくる無差別スキャン通信の量として定量的に確認できた

---

## 3. WebSocket API チャットアプリ(API Gateway + Lambda + DynamoDB)

準備中。実施後に追記する。

---

## 4. Amazon CloudWatch Logs メトリクスフィルタ×アラーム(Alarming on logs)

**参照**: [Alarming on logs - Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Alarm-On-Logs.html)

ログの中身の特定パターンをメトリクスフィルタでカウント化し、標準のCloudWatchアラームにつなげる仕組み。静的しきい値のアラーム(CPU使用率等)の発展形にあたる。

### やったこと

1. AWS CLIでロググループ・ログストリームを作成し、`put-log-events`で`ERROR: ...`という行を投入(コンソールにログイベントを手動追加するボタンが無いため)
2. メトリクスフィルタ作成時の「パターンをテスト」機能で、デフォルトの「カスタムログデータ」欄にAWSが用意した無関係なサンプルログ(Glueクローラーのログ)が入ったままになっており、0件マッチでハマった。テキストを実際に投入した行に置き換えて解消
3. フィルタ(`ERROR`検出→`StudyConsole8823/ErrorCount`)とアラーム(しきい値0・より大きい)を作成
4. 作成直後はメトリクスに1件もデータが無く「データ不足」のままだった。**メトリクスフィルタは作成後に届くログにしか適用されず、過去ログには遡及しない**仕様と判明。改めてログを1行投入したところメトリクスに反映され、数分後にアラームが`ALARM`状態へ遷移することを確認
5. アラーム・ロググループを削除して片付け

### 得られた知見

- CloudWatch Logsのメトリクスフィルタは過去ログに遡って適用されない。「フィルタを作ったのにアラームが発火しない」と詰まったら、まずフィルタ作成タイミングとログ投入タイミングの前後関係を疑うべき
- パターンテスト機能のデフォルト値はAWS用意のサンプルデータであり自分の実データではない。0件マッチ=パターンの書き方が間違っている、とは限らない

---

## 5. Amazon SQS × Amazon EventBridge Scheduler(デッドレターキュー)

**参照**: [Getting started with Amazon SQS](https://aws.amazon.com/sqs/getting-started)、[Getting started with EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/getting-started.html)、[Configuring a schedule's dead-letter queue](https://docs.aws.amazon.com/scheduler/latest/UserGuide/configuring-schedule-dlq.html)

SQSでの非同期メッセージングの基本と、EventBridge Schedulerによるサーバーレスなスケジュール実行、およびスケジュール失敗時の受け皿となるデッドレターキュー(DLQ)を実践した。

### やったこと

1. SQS標準キューを作成し、コンソールから送信→受信→削除の基本操作を確認
2. EventBridge Schedulerで1回限りのスケジュールを作成し、SQSへのメッセージ送信をトリガー → 実行後キューにメッセージが届くことを確認
3. DLQ検証のため「わざと失敗するターゲット」を作ろうとしたところ、テンプレート化されたSendMessageターゲットは既存の実在キューしか選べず、存在しないキューを指定できないという制約に遭遇。「ユニバーサルターゲット定義」に切り替えて生JSONでQueueUrlを直接記述することで解決
4. ユニバーサルターゲット定義に切り替えると「このスケジュール用に新しいロールを自動作成」オプションが使えなくなり、既存ロールを手動で選ぶ必要が生じた。CLIでIAMロールのポリシーを確認し、「存在しないターゲットキューへの送信権限は無い(確実に失敗する)が、DLQに指定した実在キューへの送信権限は持っている(退避は成功する)」既存ロールをあえて選定して両立させた
5. 実行後、DLQに指定したキューに失敗したリクエストの内容(存在しないQueueUrlを含むJSON)がそのまま退避されていることを確認
6. スケジュール・キューを削除して片付け

### 得られた知見

- EventBridge Schedulerのテンプレート化ターゲットは「実在するリソースを選ぶUI」であり、意図的に失敗させる設定を組みたい場合は「ユニバーサルターゲット定義」で生のAPIリクエストを書く必要がある
- 「ターゲットへの権限」と「DLQへの権限」は同じ実行ロールが両方担うため、ロール設計次第で「片方だけ失敗させ、DLQ書き込みは成功させる」という一見矛盾した挙動を意図的に作れる

---

## 6. AWS Step Functions(Hello World / DynamoDB CRUD)

**参照**: [Learn how to get started with Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/getting-started.html)、[Perform DynamoDB CRUD operations with Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/connect-ddb.html)

ワークフローオーケストレーションの基本と、Lambdaを介さずDynamoDBを直接操作する最適化された統合を実践した。

### やったこと

1. コンソールのテンプレートギャラリーに「Hello World」という名前のテンプレートが見当たらず(検索0件)、「空白から作成」を選んでPassステートを手動配置。コンソールのテンプレート一覧は公式ドキュメントの記載と乖離することがあると分かった
2. ステートマシン名にスペースを含めて命名エラー(英数字・ダッシュ・アンダースコアのみ許可)を経験
3. 実行して`SUCCEEDED`、状態遷移3回(Start→Pass→End)を確認
4. DynamoDB CRUD編:Workflow StudioでPutItem→GetItemの最適化統合を構築する際、アクション検索結果で類似名の「BatchGetItem」を誤ってドラッグし、かつ配置位置(PutItemの前)も誤るという二重の事故が発生。該当ステートを削除し、正しい「GetItem」を正しい位置に置き直して復旧
5. 実行後、AWS CLIで`aws dynamodb scan`を叩き、Step Functions経由でテーブルに実際に項目が書き込まれたことを裏取り
6. ステートマシン・DynamoDBテーブルを削除して片付け

### 得られた知見

- Step Functionsの「最適化された統合」を使うと、Lambda関数を介さずDynamoDBのGetItem/PutItem/UpdateItem/DeleteItemを直接ワークフローのステートとして呼び出せる(CreateTable等はSDK統合が別途必要)
- Workflow Studioのアクション検索結果には類似名のアクション(GetItem/BatchGetItem/TransactGetItems等)が並ぶため、名前だけで即ドラッグせず統合タイプ・API名を確認してから配置すべき

---

## 7. Amazon ECS Fargate(コンソール／CLI)

**参照**: [Learn how to create an Amazon ECS Linux task for Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html)、[Creating an Amazon ECS Linux task for the Fargate with the AWS CLI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_AWSCLI_Fargate.html)

サーバーレスなコンテナ実行基盤(Fargate)でLinuxタスクを動かす基本を、コンソール版・CLI版の両方で実践した。

### やったこと

1. コンソール版:セキュリティグループ(HTTP=80番インバウンド許可)→クラスター→タスク定義(httpdイメージ)→サービスの順で作成。サービス作成時のネットワーキング設定で、意図せずデフォルトSGが選択されたままになっているミスに気づき、作成したSGに選び直した
2. サービス経由でタスクが`RUNNING`になり、パブリックIPにブラウザでアクセスして「It works!」を確認
3. サービスを削除しようとしたところ`The service cannot be stopped while it is scaled above 0.`というエラーに遭遇。必要なタスク数を先に0へ更新してから削除することで解消
4. 空になったクラスターに対して明示的な削除操作をしていないにもかかわらず、コンソール上で自動的に「非アクティブ」へ遷移していることをCLI(`describe-clusters`)でも確認。AWSが空クラスターを自動的に非アクティブ化する仕様と判明
5. CLI版:`create-cluster`→`register-task-definition`(公式サンプルJSON・実行ロール指定不要)→`run-task`(既存のSG・サブネットを再利用)の3コマンドで同じ構成を再現し、ブラウザで再度「It works!」を確認
6. `stop-task`→`delete-cluster`で片付け

### 得られた知見

- ECSサービスは「稼働中(スケール0より大きい)」のままでは削除できない。削除前に必要タスク数を0に更新し、実際にタスクが止まるのを待つ必要がある
- タスク・サービスが0件になった空のECSクラスターは、明示的な削除操作をしなくてもAWS側で自動的に非アクティブ化される
- コンソールで組んだ構成を、同じ内容のAWS CLIコマンド数個で過不足なく再現できることを確認した
