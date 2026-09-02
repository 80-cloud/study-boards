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

**参照**: [Tutorial: Create a WebSocket chat app with a WebSocket API, Lambda and DynamoDB](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-chat-app.html)、[Use wscat to connect to a WebSocket API and send messages to it](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-wscat.md)

CloudFormationで用意されたDynamoDBテーブル・Lambda関数群と、WebSocket APIを自分で紐付けてチャットアプリのバックエンドを構築する。

### やったこと

1. CFNテンプレート(zip)をダウンロードしてスタック作成。チュートリアル本文はLambda関数を「3つ」と読める書き方だったが、テンプレート本体を事前に読んだところ実際は`ConnectHandler`/`DisconnectHandler`/`SendMessageHandler`/`DefaultHandler`の**4つ**だった
2. 各Lambda関数の物理名には、CloudFormationが論理ID由来のランダムな英数字サフィックスを付与しており(例:`websocket-api-chat-app-tuto-ConnectHandler2FFD52D8-dkYXyqXyvN6j`)、かつ64文字制限により関数名ごとに切り詰められ方が異なっていた。事前にCLIで正確な名前を確認してからAPI Gatewayでの紐付けに臨んだ結果、取り違えなく一致させられた
3. DynamoDBテーブルはオンデマンドではなく、テンプレートで明示的にプロビジョンド(5 RCU + 5 WCU)に設定されていた。永続無料枠(25+25)の範囲内であることを確認した
4. Lambda実行ロールには、API作成前の時点で`execute-api:ManageConnections`の権限がワイルドカード(`*/*/POST/@connections/*`)で事前に付与されており、「APIがまだ存在しないのに権限を持てるのか」という懸念は杞憂だった
5. WebSocket API作成時、4つのルート($connect/$disconnect/$default/sendmessage)にそれぞれ対応するLambda関数を紐付け、CLIで統合先の一致を裏取りした
6. wscatを2ターミナルで接続し、sendmessageルートのブロードキャスト・$defaultルートでの接続情報返却・$disconnect時のDynamoDBレコード削除(接続時2件→切断後1件)を実機で確認した
7. 片付けはWebSocket API→CloudFormationスタックの順で実施(逆順だと依存関係エラーになりうる)。CLIで両方の消滅を確認した

### 得られた知見

- チュートリアル本文の記載を鵜呑みにせず、CloudFormationテンプレート本体を先に読むことで、実際のリソース数・命名規則を正確に把握してから作業に臨めた
- ランダムサフィックス付きの物理名は文字数制限により切り詰められ方が個体ごとに異なるため、コンソールでの紐付け作業前にCLIで正確な名前を確認しておくと取り違え事故を防げる

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

---

## 8. Amazon EventBridge Pipes(DynamoDB Streams → SQS、イベントフィルタ)

**参照**: [Tutorial: Create an EventBridge pipe that filters source events](https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-tutorial-create-dynamodb-sqs.html)

DynamoDBストリームをソース、SQSをターゲットとし、間にイベントパターンによるフィルタを挟んでPipeを構築する。

### やったこと

1. このチュートリアルはzipダウンロードではなく、CFNテンプレートのJSON本文がドキュメントに直接埋め込まれている形式だった。ローカルにファイルとして保存してからアップロードする必要があった
2. 前提条件のテンプレートはDynamoDBテーブルとSQSキューのみでIAMリソースを含まないため、前回(WebSocketチュートリアル)で必須だった「IAMリソース作成の承認」チェックボックス自体が出現しなかった
3. イベントパターンの入力欄で貼り付けが効かない事象が発生。原因は「サンプルイベント」表示欄(読み取り専用)と「イベントパターン」入力欄(編集可能)を混同していたことで、正しい欄をクリックし直すことで解決した(貼り付けが効かない場合は手入力でも解決可)
4. DynamoDBテーブルに対しINSERT→MODIFY→REMOVEの3操作を行い、SQS側をポーリング。フィルタ(`eventName: ["INSERT","MODIFY"]`)通り**2件のみ配信され、REMOVEイベントは一度も届かなかった**ことをCLIで確認した(SQSの`ApproximateNumberOfMessages`でも裏取り)
5. 片付けはPipe→CloudFormationスタックの順で実施。CLIで全リソース(Pipe・スタック・テーブル・キュー)の消滅を確認した

### 得られた知見

- Pipeの料金はフィルタを通過したイベント数のみに課金され、除外されたイベントは課金対象外(公式料金ページ本文で確認。DynamoDBストリーム自体は追加課金なし)
- コンソールのコードエディタ系入力欄では、似た見た目の「サンプル/読み取り専用表示」と「実際の編集対象」を取り違えやすい。貼り付けが効かない時はまずどちらの欄を操作しているか確認すべき

---

## 9. AWS CodeDeploy × AWS SAM(Lambdaへの段階的デプロイ)— 保留中

**参照**: [Tutorial: Deploy an updated Lambda function with CodeDeploy and the AWS Serverless Application Model](https://docs.aws.amazon.com/codedeploy/latest/userguide/tutorial-lambda-sam.html)、[Deploying serverless applications gradually with AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html)

SAMの`DeploymentPreference`(Canary/Linear/AllAtOnce)でLambdaのカナリアリリースを行うチュートリアル。**アカウント側の制限により未完了**。

### やったこと

1. ローカルにSAM CLIを導入した(Homebrew、v1.164.0)
2. `aws deploy list-applications`実行時に`SubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service`というエラーに遭遇した
3. IAMポリシーシミュレーター(`simulate-principal-policy`)で権限自体は`allowed`であることを確認し、IAM権限の問題ではないと切り分けた
4. rootユーザーでコンソールを確認したところ、アカウントが「Freeアカウントプラン」で登録が完了しておらず、一部サービス(CodeDeploy)へのアクセスが制限されていることが判明した
5. 支払い設定の確認・アップグレードは課金判断を伴うため、本人確認の上で今回は保留とした

### 得られた知見

- `SubscriptionRequiredException`はIAM権限エラーではなく、アカウント自体がそのサービスを利用可能な状態になっていない(Freeプランの制限・支払い未完了等)ことを示すエラーである場合がある。IAMポリシーシミュレーターで権限が`allowed`と出ているのにAPIが弾かれる場合は、アカウントレベルの制限を疑うべき
- Lambdaのエイリアス+重み付きルーティング(`RoutingConfig`)はCodeDeployと独立したLambda本体の機能であり、時間経過での自動シフトやCloudWatchアラームでの自動ロールバックといった「自動化」の部分だけをCodeDeployが肩代わりしていると整理できた

---

## 10. 可観測性比較:AWS X-Ray vs CloudWatch Application Signals(Lambda)

**参照**: [Set up AWS X-Ray with API Gateway REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enabling-xray.html)、[Enable your applications on Lambda(Application Signals)](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable-LambdaMain.html)、[AWS Distro for OpenTelemetry Lambda Support for Java](https://aws-otel.github.io/docs/getting-started/lambda/lambda-java)

3つの可観測性チュートリアルを比較検証した。SAMでJava 21 + API Gateway + Lambdaの検証用の土台(`observability-lambda-lab/`)を自作し、同じLambda関数の上で段階的に機能を有効化して違いを比較した。

### やったこと

1. 事前調査で、手動ADOTレイヤーとApplication Signalsが実は同一の「AWS Lambda Layer for OpenTelemetry」を使っており、環境変数`AWS_LAMBDA_EXEC_WRAPPER`の値が違うだけ(前者は`/opt/otel-handler`系、後者は`/opt/otel-instrument`)と判明した。両方を同時に重ねると設定の奪い合いになるため、**同じ関数上で1つずつ有効化→観察→次**の順で比較する方針にした
2. API Gatewayステージ+Lambda本体の両方でX-Rayを有効化し、リクエストを送信した。Trace Mapで「クライアント→API Gateway→Lambda」の1本のトレースを確認できた。1回目のリクエストのみDuration 0.885秒、2・3回目は0.046〜0.056秒と大差があり、Lambdaのコールドスタートがトレースの数値として実際に可視化されることを確認した
3. 続けてApplication Signalsを追加有効化した。裏で`AWSOpenTelemetryDistroJava`レイヤーと環境変数`AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument`が自動設定された
4. 公式ドキュメントには手動有効化時に管理ポリシー`CloudWatchLambdaApplicationSignalsExecutionRolePolicy`を実行ロールに付与する必要があると記載されていたが、コンソールのチェックボックス経由では実際にはこのポリシーは付与されなかった。Lambdaログに権限エラーは出ておらず(`AWS Application Signals enabled`のログのみ)、Application Signals側のサービス一覧でも`InstrumentationType`が`UNINSTRUMENTED`→`INSTRUMENTED`に変化したことを確認し、このポリシー無しでも動作することを実機で確認した
5. Application Signalsの「サービス」画面で、Lambda関数がサービスとして自動検出され、可用性100%・SLO作成ボタンが表示されることを確認した。X-Rayが「1リクエスト単位の詳細」を見せるのに対し、Application Signalsは「サービス単位の健全性の自動集計+SLO」という一段上のレイヤーであることを体感した
6. 手動ADOT(レガシー版)は上記の通りApplication Signalsとほぼ同一の仕組みのため、追加検証は見送った
7. `sam delete`でスタック一括削除後、スタック管理外で自動生成されていた残骸(X-Ray有効化時にLambdaコンソールが作成したIAMポリシー、データ0バイトのCloudWatchロググループ)をCLIで発見し、削除した。最終的に全リソースの消滅をCLIで確認した

### 得られた知見

- CloudWatch Application Signalsは独立した新サービスではなく、X-Rayの上に「ADOTレイヤーによる自動計装+SLO機能」を乗せたものである。手動ADOTとApplication Signalsは同じレイヤー機構を奪い合うため併用しない方がよい
- 公式ドキュメントに書かれた必要IAMポリシーが、実際のコンソール操作では付与されていなくても機能する場合がある。「ドキュメント記載の権限=実際に必要な権限」とは限らず、ログでエラーの有無を確認するのが確実
- CloudFormation/SAMスタックの管理外でコンソール操作(X-Rayのアクティブトレーシング有効化等)によって自動生成されたIAMポリシーは、スタック削除後も残骸として残る。スタック削除後は`describe`系コマンドで管理外残骸の有無を確認する習慣が有効

---

## 11. Private REST API × Amazon ECS Blue/Greenデプロイ(ネイティブ方式)

**参照**: [Tutorial: Create a private REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/private-api-tutorial.html)、[Creating an Amazon ECS blue/green deployment](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deploy-blue-green-service.html)、[Application Load Balancer resources for blue/green, linear, and canary deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb-resources-for-blue-green.html)、[Amazon ECS infrastructure IAM role for load balancers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AmazonECSInfrastructureRolePolicyForLoadBalancers.html)

VPC内からのみアクセス可能なAPIの構築と、ECS自体が持つ新しいBlue/Greenデプロイ機構(CodeDeploy不要)を実践した。

### やったこと

1. Private API用のCFNテンプレート本体を事前にダウンロードして確認したところ、テスト用EC2インスタンスタイプがデフォルトで`t3.nano`だった。このアカウントには無料利用枠対象インスタンスタイプ以外を起動禁止する制限がかかっており、`CREATE_FAILED`(`The specified instance type is not eligible for Free Tier`)→自動ロールバックが発生した。`describe-instance-types --filters free-tier-eligible=true`で対象タイプ(`t3.micro`等)を確認し、テンプレートを書き換えて再デプロイし成功させた
2. API作成時、コンソールで「プライベート」エンドポイントタイプに切り替えてVPCエンドポイントIDを入力したはずが、`get-rest-api`で確認すると`endpointConfiguration.vpcEndpointIds`が空のまま作成されていた。設定画面で改めて紐付け直すことで解消した
3. リソースポリシー(`aws:sourceVpce`条件)をアタッチしtestステージへデプロイ。手元の端末からの`curl`は名前解決失敗(`Could not resolve host`)、Session Manager経由でEC2内から叩いた`curl`は`"Hello from Lambda!"`が返り、VPC限定アクセスであることを内外両面から確認した
4. Amazon ECSのBlue/Greenデプロイには「CodeDeploy経由(旧)」と「ECSネイティブ(新)」の2つの別ページ・別機構が存在し紛らわしいことに気づいた。両方の公式ページを実際に開いて比較し、`deploymentController.type=ECS`+`deploymentConfiguration.strategy=BLUE_GREEN`を使うネイティブ方式を採用した
5. サービス定義に必要な`loadBalancers[].advancedConfiguration.productionListenerRule`は、リスナー自体のARNではなく別リソースである「リスナールール」のARNだった。リスナー作成時に自動生成されるデフォルトルールのARNを`describe-rules --listener-arn`で別途取得する必要があった
6. ECSコンソールのサービス作成画面で「グリーンターゲットグループ」選択欄がクリックに反応しない不具合に遭遇した(キーボード操作・ブラウザ表示倍率変更でも解消せず)。`aws ecs create-service`をCLIで1コマンド実行し、同じ設定を投入することで回避した
7. サービスを初めて作成した直後は、比較対象となる既存のBlueが存在しないため、新しいリビジョンがいきなりGreen(alternate)側に配置され、Bake time後にそのまま本番(リスナー重み100%)になる、という初回特有の挙動を確認した。Blue側は空のままだった
8. タスク定義を更新(タスクメモリ0.5GB→1GB)してサービスを再デプロイし、実際のBlue/Green切り替わりをCLIでリアルタイムに追跡した:新リビジョンがBlue側に立ち上がりヘルスチェック通過→本番リスナーの重みがGreen 100%→Blue 100%へ反転→旧タスクが`draining`状態で切り離される、という一連の流れを`describe-services`/`describe-target-health`/`describe-rules`で裏取りした
9. 使用したリソース(NATゲートウェイ2基・ALB・ターゲットグループ2つ・IAMロール・セキュリティグループ2つ・ECSクラスタ・タスク定義等)をすべて削除し、AWS CLIで消滅を確認した

### 得られた知見

- 公式サンプルのCloudFormationテンプレートのデフォルト値(EC2インスタンスタイプ等)が、自分のアカウント固有の制限(無料利用枠限定等)に適合するとは限らない。`CREATE_FAILED`の`ResourceStatusReason`を実機で読み、対応するAWS CLIコマンド(`describe-instance-types`等)で許容される値を確認してから修正するのが確実
- API Gatewayのプライベートエンドポイントは、コンソール上で「VPCエンドポイントIDを入力した」ように見えても、実際に反映されているとは限らない。`get-rest-api`で`endpointConfiguration.vpcEndpointIds`を都度CLIで裏取りする習慣が有効
- Amazon ECSのBlue/Greenデプロイには「CodeDeploy経由(旧)」と「ECSネイティブ(新)」の2つの仕組みが並存しており、ドキュメントページも別々に存在する。参照するページを取り違えないよう、着手前にどちらの方式かを明確にする必要がある
- `productionListenerRule`はリスナーそのものではなく「リスナールール」という別リソースのARNを要求する。リスナー作成時に自動生成されるデフォルトルールのARNを`describe-rules`で別途取得する一手間が必要になる
- サービスの初回作成時はBlue側が空のまま、新リビジョンがいきなりGreen側で本番稼働する。「Blue」「Green」という名前は固定の役割ではなく、単に「今の本番」と「次のデプロイ先」を交互に使う2つの箱に過ぎない
- コンソールのUIが特定の入力欄でクリックに反応しない不具合に遭遇した場合、無理に固執せずAWS CLIの`create-service`(1コマンド)に切り替えることで、同じ設定を確実に投入できる

---

## 12. IAM Permissions Boundaryによる権限委任(同一アカウント内)

**参照**: [Permissions boundaries for IAM entities](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)、[IAM and AWS STS condition context keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html)、[Testing IAM policies with the IAM policy simulator](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html)、[Delegate permission management to developers using IAM permissions boundaries(AWS Security Blog)](https://aws.amazon.com/blogs/security/delegate-permission-management-to-developers-using-iam-permissions-boundaries/)

IAMロールに付けられる権限の「天井」をPermissions Boundaryで固定し、その天井の下でなら開発担当者自身にIAMロールの作成・管理を任せられることを、委任元(管理者)・委任先(開発担当者)の2つの立場を実際に使い分けて検証した。

### やったこと

1. 天井となる管理ポリシー`DeveloperPermissionsBoundary`(S3の特定バケットのみ+Lambda実行に必要なCloudWatch Logs書き込みのみ許可)と、委任先に付ける`IAMDelegatedAdminPolicy`(Boundary必須でのロール作成・自分のロールへのAssumeRole・PassRole・Boundary自体の解除/編集の明示Deny等)を管理者側で作成した
2. 委任先役のIAMユーザー`iam-boundary-dev`(プログラムアクセスのみ)を作成しアクセスキーを発行。CLIプロファイルへの登録で`InvalidClientTokenId`(Access Key IDの末尾を大文字の`I`と数字の`1`で書き間違え)、直した後も`SignatureDoesNotMatch`(Secret Access Keyの手入力ミス)と2段階でつまずいた。Secret Access Keyは発行時にしか表示されず後から答え合わせできないため、都度直すより新しいキーを作り直す方が早いと判断した
3. 委任先ユーザーとしてCLIから`iam:CreateRole`を試行:Boundaryを指定しない場合は`AccessDenied`(完成条件2)、`--permissions-boundary`を指定した場合は成功(完成条件1)することを確認した
4. 作成したロール`limited-app-role`に`AdministratorAccess`をアタッチ(アタッチ自体は成功)した上でAssumeRoleし、一時クレデンシャルでS3(Boundary許可範囲内)は成功、EC2(Boundary範囲外)は`UnauthorizedOperation`(エラー文に`because no permissions boundary allows the ec2:DescribeInstances action`と明記)になることを確認した。AdministratorAccessが付いていてもBoundaryが天井として効くことを実機で見た
5. 委任先ユーザー自身による`delete-role-permissions-boundary`(Boundary解除)を試行し、`IAMDelegatedAdminPolicy`の明示Denyにより拒否されることを確認した(完成条件4)
6. `iam:PassRole`の検証のため最小のLambda関数を用意し、`limited-app-role`を実行ロールとして`CreateFunction`を試行。当初の設計案(`iam:PassRole`に`iam:PermissionsBoundary`条件を付ける)では`AccessDenied`(`no identity-based policy allows the iam:PassRole action`)となり、期待通りに動かないことが実機で判明した
7. AWS公式ブログの実装例を確認したところ、`iam:PassRole`にはBoundary条件を付けず、Resourceのパス(`role/delegated/*`)限定のみで済ませていた。ロール作成時にBoundary必須の条件+Boundary解除/編集の明示Denyが既にあるため、そのパス配下のロールは構造上常にBoundary付きであることが保証されており、PassRole側で改めてBoundaryを確認する必要が無いという設計だと理解し、同じ形に修正した
8. ポリシーのコンソール編集で、目的のステートメントとは別の`CreateRoleOnlyWithBoundary`ステートメントを誤って上書き消去してしまう事故が発生した。「重複するステートメントIDはサポートされていません」というエディタのエラーで発覚し、全文貼り替えで復旧した
9. ポリシー修正後に`CreateFunction`を実行すると成功した(完成条件5)。この直前にターミナルへ表示されていた`AccessDenied`は、実は修正前(旧ポリシー)の実行結果がそのまま画面に残っていただけで、修正後の呼び出しは1回目から成功していたと、CloudTrailの呼び出し回数と手元のターミナル全履歴を突き合わせて判明した。比較用の管理者ロール`admin-role-not-delegated`(Boundary無し・パスが`/delegated/`外)へのPassRoleは、Resourceパターン不一致により`AccessDenied`のままだった(完成条件6)
10. `iam simulate-principal-policy`で条件5・6と同じ組み合わせを評価し、実機と同じ`allowed`/`implicitDeny`が返ることを確認した(完成条件7)
11. 使用したリソース(Lambda関数・IAMロール2つ・IAMユーザー・管理ポリシー2つ・S3バケット)をすべて削除し、AWS CLIで全て`NotFound`/`NoSuchEntity`になることを確認した

### 得られた知見

- Permissions Boundaryの実効権限は「アイデンティティポリシー ∩ Boundary」の積集合であることを、`AdministratorAccess`付きロールでもBoundary外の操作(EC2)だけ拒否される形で実機確認できた。拒否時のエラー文にも`no permissions boundary allows`と明記され、原因の切り分けがしやすい
- `iam:PassRole`のCondition要素で`iam:PermissionsBoundary`を直接指定する設計は、実機では機能しなかった(Statement自体が無かった扱いになり暗黙Deny)。AWS公式ブログはPassRole側にBoundary条件を付けず、ロール作成時の条件+Boundary解除/編集への明示Denyの組み合わせで「そのResourceパス配下は常にBoundary付き」を構造的に保証し、PassRoleはResourceパスの限定だけで済ませていた。これが実証済みの設計パターン
- 修正後に「1回失敗してから成功した」ように見えても、ターミナルに残っていた古い出力を新しい実行結果と早合点している場合がある。CloudTrailの呼び出し回数など別の記録と突き合わせて初めて、実際には修正後1回目から成功していたと分かった。原因を語る前に、その出力が本当に今の実行分なのかを確認する必要がある
- Secret Access Keyは発行時にしか表示されないため、手入力による書き写しミスは後から答え合わせできない。怪しいときは推測で直すより新しいキーを発行し直す方が早い
- コンソールのポリシーJSONエディタで部分的な貼り替えを行うと、意図しない別のステートメントを上書きしてしまうことがある。修正範囲が広い場合は全文を選択して丸ごと貼り替える方が事故が少ない

---

## 13. Systems Manager OpsCenter × CloudWatch Alarm × Automationの自己修復パイプライン

**参照**: [AWS Systems Manager OpsCenter](https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter.html)、[Configure CloudWatch alarms to create OpsItems](https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-create-OpsItems-from-CloudWatch-Alarms.html)、[Managing duplicate OpsItems](https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-working-deduplication.html)、[Run automations based on EventBridge events](https://docs.aws.amazon.com/systems-manager/latest/userguide/running-automations-event-bridge.html)、[Amazon EventBridge event examples for Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitoring-systems-manager-event-examples.html)、[aws:executeAwsApi](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-executeAwsApi.html)、[aws:invokeLambdaFunction](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-lamb.html)、[aws:waitForAwsResourceProperty](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-waitForAwsResourceProperty.html)、[aws:branch](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-branch.html)

Lambda関数の障害をCloudWatch Alarmで検知してOpsItemを自動生成し、Automationランブックで事前確認・復旧・事後確認・条件分岐(成功なら解決/失敗ならSNS通知)まで自動化する、自己修復パイプラインを構築した。

### やったこと

1. 意図的に例外を投げるLambda関数(環境変数`FAIL_MODE`でON/OFF切替)と、`Errors`メトリクスを監視するCloudWatch Alarmを作成。アラームの`alarm-actions`にOpsItem用ARN(`arn:aws:ssm:{region}:{account}:opsitem:{severity}#CATEGORY={category}`)を指定するだけで、EventBridgeルールを自分で作らなくてもALARM遷移時にOpsItemが自動生成されることを確認した
2. SNSトピックを「FIFO」で誤作成してしまい、Eメールをサブスクライブできない(FIFOはSQSのみ対応)ことに気づき作り直した。トピックのタイプは作成後に変更不可なため削除して再作成する必要があった
3. SNSのサブスクリプション確認は、確認メールのリンク先ページに「Subscription confirmed」の表示と並んで「click here to unsubscribe」リンクが同じ画面に載っており、誤って両方踏んでしまうと購読が`Deleted`になる。`list-subscriptions-by-topic`はこの`Deleted`表示に強い遅延(結果整合性のズレ)があり、個別ARNを指定する`get-subscription-attributes`の方が実態に近いことを確認した
4. Automationランブック(`aws:executeAwsApi`でOpsItem更新・Lambda操作、`aws:branch`で分岐)をYAMLで作成し、EventBridgeルール(`source: aws.ssm`, `detail-type: "OpsItem Create"`というOpsCenter専用のネイティブイベント)でランブックを自動起動する構成を組んだ
5. IAMロール(`iam:PassRole`でAutomationAssumeRoleを渡す構成)の権限不足で`ssm:StartAutomationExecution`が2段階でAccessDeniedになった。1段階目は対象リソースのARN形式が`automation-definition/name:*`ではなく`document/name`だったこと、2段階目は`document/name`だけでなく`automation-execution/*`(実行結果側のリソース)にも別途許可が要ったことが、CloudTrailのエラーメッセージから判明した
6. Lambdaを呼び出す`postCheck`ステップは、当初`aws:executeAwsApi`(Service: lambda, Api: Invoke)で設計したが、Invoke APIのレスポンスがストリーミング形式を含み得るため、Lambda専用の`aws:invokeLambdaFunction`アクション(`FunctionError`が自動出力される)に変更した
7. `recovery`ステップ(`UpdateFunctionConfiguration`でFAIL_MODEをfalseに戻す)の直後に`postCheck`を実行すると、設定変更の反映が完了する前にLambdaが呼ばれてしまい、古い設定のまま失敗することがあった。`aws:waitForAwsResourceProperty`で`LastUpdateStatus`が`Successful`になるまで待つステップを挟んで解消した
8. Lambda呼び出しがエラー(`FunctionError`)を返すと、`aws:invokeLambdaFunction`のステップ自体が`Failed`扱いになり、既定(`onFailure: Abort`)ではAutomation全体がそこで中断し、後続の`aws:branch`による分岐(SNS通知ルート)に到達しないことが実機で判明した。該当ステップに`onFailure: Continue`を追加し、失敗時も後続ステップへ進めるよう修正した
9. E2Eで4回試行し、①IAM権限不足→②別リソースタイプのIAM権限不足→③設定反映ラグによる誤判定、の3つの実機障害を順に踏んで解決した上で、最終的にOpsItem作成→Automation自動起動→復旧→OpsItem解決までの一連の流れを完走させた
10. 重複集約(dedup)を検証するため、一時的にEventBridgeルールを無効化し、OpsItemがOpenのまま同じアラームを2回発火させた。CloudTrailには`CreateOpsItem`が2回とも記録されていたが、実際のOpsItemは1件のまま(`LastModifiedTime`も更新されず)で、SSM側が重複を検知して静かに握りつぶしていることを確認した
11. 復旧失敗ケースを検証するため、Lambdaのハンドラー名を一時的に壊し(`recovery`ステップがFAIL_MODEしか直さないため、これは直らない)、`postCheck`失敗→`branchOnResult`→`notifyFailure`(SNS Publish)のルートを通ることを確認した。ただしSNS Publish APIはAWS側で成功(MessageId返却)していたが、Eメールは受信トレイにも迷惑メールフォルダにも届かなかった。SNSのEメールプロトコルはHTTP/Lambda/SQS向けの配信ステータスログ(CloudWatch Logs)の対象外で、AWS側から配達状況を追跡する手段がないことも合わせて判明した
12. EventBridge自動起動と人間による手動実行(`aws ssm start-automation-execution`をCLIから直接実行)を1回ずつ行い、`ExecutedBy`を比較した。自動時は`arn:aws:sts::...:assumed-role/OpsSelfHealDemo-EventBridgeInvokeRole/...`、手動時は`arn:aws:iam::...:user/tesuto`と、実行者の記録が明確に異なることを確認した
13. 使用したリソース(Lambda・CloudWatch Alarm・SNSトピック・IAMロール2つ・Automationランブック・EventBridgeルール)を削除し、CLIで消滅を確認した

### MTTA・MTTR・再発件数(全ステップ修正後・9番目のE2E試行の実測値)

| 指標 | 実測値 | 算出根拠 |
|---|---|---|
| MTTA(検知までの時間) | 約2分3秒 | Errorsメトリクス計上(10:25:00)からOpsItem自動作成(10:27:02.941)まで |
| MTTR(障害発生起点) | 約2分20秒 | Errorsメトリクス計上(10:25:00)からOpsItem解決(10:27:20.294)まで |
| MTTR(検知起点・純粋な復旧処理時間) | 約17秒 | OpsItem作成(10:27:02.941)からOpsItem解決(10:27:20.294)まで。Automation自体の実行時間(開始10:27:12.589〜終了10:27:20.457)とほぼ一致 |
| 再発件数(dedupで集約された件数) | 1件 | 同一OpsItemがOpenの状態でアラームを再発火させたところ、CloudTrail上は`CreateOpsItem`が2回呼ばれたが実際のOpsItemは1件のまま(重複1件を集約) |

上記はIAM権限・タイミング競合の3つの実機障害を解決した後の、初めて完走したE2E実行の値。手動実行(CLI経由)は同条件で約8秒(11:07:03.787〜11:07:11.625)とほぼ同水準だった。

### 得られた知見

- CloudWatch Alarmの`alarm-actions`にOpsItem用ARNを指定する経路は、OpsCenterの「Integrated Setup」(Auto Scaling/EBS/RDS等のデフォルトルールを一括有効化する別の有料機能)を経由しなくても独立して機能する。両者は別物であり、混同すると不要な設定に手を出してしまう
- IAM権限のResourceに正しいARN形式を書けたつもりでも、対象APIが内部的に複数のリソースタイプ(今回は`document/name`と`automation-execution/*`)への権限を要求している場合があり、これは公式ドキュメントを読むだけでは分からず、実際にAccessDeniedを起こしCloudTrailのエラーメッセージを読んで初めて確定できた。前回セッションの教訓通り「推測で語る前に一次証跡で確認する」がここでも効いた
- SSM Automationの各アクションには「レスポンスの特定フィールドが埋まっていたら即座にステップを失敗扱いにする」という暗黙の挙動を持つものがある(`aws:invokeLambdaFunction`の`FunctionError`)。この挙動は`onFailure: Continue`を明示しないと後続の分岐ロジックに到達できず、正常系だけをテストしていると気づけない
- AWS APIの「呼び出しが成功した(200 OK)」と「変更が完全に反映された」は別物であり、直後に依存する処理を実行すると設定反映ラグによる誤判定が起きる。`aws:waitForAwsResourceProperty`のような「状態を待つ」専用の仕組みを挟むのが確実
- SNSの「Publish APIが成功した」は「メールボックスに届いた」を保証しない。Eメールプロトコルは配信ステータスログの対象外であり、AWS側からは配達の成否を追跡できない。到達しない場合、AWS側の記録(Publish成功・購読確認済み)までは実機で確認できても、その先(受信サーバー側のフィルタリング等)は別問題として切り分けて考える必要がある
- `list-subscriptions-by-topic`のような一覧系APIと、`get-subscription-attributes`のような個別リソース参照系APIとで、同じ購読の状態表示が食い違うことがある(結果整合性のズレ)。判断に迷ったときは個別リソースを直接参照するAPIの方が信頼できる

---

## 14. Systems Manager Patch Manager(Quick Setup Patch Policy)×Canary/Production段階適用パイプライン

**参照**: [Configure patching using a Quick Setup patch policy](https://docs.aws.amazon.com/systems-manager/latest/userguide/quick-setup-patch-policy.html)、[Patch policy configurations in Quick Setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/quick-setup-patch-policy-configuration-options.html)、[AWS Systems Manager Patch Manager tutorials](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-tutorials.html)、[Tutorial: Update application dependencies, patch a managed node, and perform an application-specific health check](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-tutorial-update-app-health-check.html)、[Amazon EventBridge event examples for Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitoring-systems-manager-event-examples.html)、[aws:runCommand](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-runCommand.html)、[aws:executeScript](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-executeScript.html)、[aws:loop](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-loop.html)、[EventBridge Scheduler execution role](https://docs.aws.amazon.com/scheduler/latest/UserGuide/setting-up.html)

Quick Setup Patch Policy(Scan専用・常時可視化)とカスタムAutomationランブック(実際のCanary→Production段階適用)を2階建てで構築し、再起動確認・ヘルスチェック・例外タグ・段階適用失敗時の中止までを一通り実機検証した。

### やったこと

1. 三現主義で現状確認: `aws ssm-quicksetup`(CLIコマンド名は`quicksetup`ではなく`ssm-quicksetup`)、AWS Config未有効化、CloudWatchにパッチ専用メトリクス無し、を実機で確認。ネイティブEventBridgeイベント(`source: aws.ssm`, `detail-type: "Configuration Compliance State Change"`)の実在を公式ドキュメントで確認し、これをSNS直接通知に採用(AWS Config不要)
2. IAMロール3種(AutomationAssumeRole・EC2インスタンスプロファイル・SchedulerInvokeRole)を作成。EventBridge Scheduler用ロールは信頼ポリシーに`aws:SourceArn`条件を付けて`AccessDenied`("must allow AWS EventBridge Scheduler to assume the role")→公式ドキュメントのシンプルな信頼ポリシー(Condition無し)に修正して解決
3. EC2インスタンス2台(Canary/Production、あえて3ヶ月前のAL2023 AMI)をコンソールで起動。当初4台構成(Canary1+Production2+例外1)を検討したが、完成条件を満たすのに必須ではないと判断し2台に縮小(例外タグの検証は同じProductionインスタンスのタグを書き換えて使い回す設計に変更)
4. SSM Run CommandでSpring Bootアプリ(review-parkバックエンド・h2プロファイル)をデプロイ。前回集大成のAnsibleロールをそのまま使う案は、ローカルにAnsible/session-manager-plugin/boto3が無く新規セットアップが重かったため、同じ手順をシェルスクリプト化してRun Commandで代替(JWT_SECRETはコードのフォールバック既定値を利用し、Secrets Manager連携は省略)
5. 要検証#2(再起動判定): EC2の`LaunchTime`はOS内部からの`reboot`では変化しないため使えないと判断し、`uptime`(`/proc/uptime`)をパッチ適用前後で比較する方式に決定。実機で「適用前14分→適用後8分」の逆転を確認し採用を確定
6. Quick Setup Patch Policy(Scan専用)を作成。ターゲットのタグ指定は**1組(Key+Value)までの制限**があることが実機で判明し、Valueを空にして「Keyのみ一致(値は問わない)」という形でCanary/Production両方をカバー。初回スキャンはS3ファイル(`baseline_overrides.json`)の生成タイミングと競合して`Failed`→再実行で解決(Quick Setup内部の非同期セットアップとの順序問題)
7. 要検証#5(コンプライアンス取得API)を実機比較: `describe-instance-patch-states`(Installed/Missing件数)と`list-resource-compliance-summaries`(COMPLIANT判定+重要度別件数)は用途が異なり、`list-compliance-summaries`はアカウント全体集計のみで個別インスタンスには使えないと判明
8. OnExitフック用SSMドキュメント(`PatchCanaryDemo-OnExit`)を1つだけ作成。PreInstall/PostInstallは今回のスコープに不要と判断し省略(未指定のフックは自動的にスキップされることを実機で確認済み)
9. カスタムAutomationランブック(`PatchCanaryRollout`)を作成。汎用の「ドキュメントを作成」ページでは「オートメーション」タイプが選択できず(Command/Sessionのみ)、Systems Manager左メニューの「自動化」(日本語UIでは「高速セットアップ」がQuick Setupの訳)経由のビジュアルビルダーで作成する必要があると判明。`aws:runCommand`の出力に`CommandId`/`Status`が最初から用意されていることをエラーメッセージ(予約済み出力名との衝突)で発見し、当初設計していた確認専用ステップ(`checkCanaryInstall`等)を削除して設計を簡略化
10. SNSトピック作成+メール購読。過去のOpsCenter教訓(Eメール到達を検証の前提にしない)を踏まえて進めたが、**今回は実際にメールが届いた**(パッチ適用失敗の通知)
11. EventBridge Scheduler(週次自動実行)を作成。cron式は6フィールド入力欄(分/時間/日付/月/曜日/年)形式で、タイムゾーン設定(Asia/Tokyo)がcron評価に直接影響することを確認
12. EventBridge Rule(重要パッチ未適用→SNS直接通知)を作成。ターゲットにSNSトピックを選ぶと、コンソールが専用の実行ロール(`Amazon_EventBridge_Invoke_Sns_*`)を自動作成する方式で、SNS側のリソースポリシーは不要だった
13. E2E実行(成功系)で`ssm:DescribeInstanceInformation`・`ssm:ListCommands`の権限漏れを2回連続で実機のAccessDeniedから発見・修正。3回目の実行で**Productionのパッチ適用が実際に失敗**(`dnf update system-release`が`returncode -9`=OOM Killerによる強制終了)。t3.micro(メモリ1GB)にスワップ2GBを追加して解決し、再実行で完走(Canary→Production両方Missing 0まで到達、`uptime`が8913秒→23秒に低下し再起動を確認)
14. 例外タグ(`PatchExempt`/`PatchExemptUntil`)の動作確認: 将来日付を設定→対象から除外(`branchOnProductionTargets`が`notifySuccess`へ直行、パッチ適用系ステップは未実行のまま完走)。ただし**旧バージョンのドキュメント(修正前)では対象0件時に`aws:runCommand`が`ValidationException`でクラッシュする設計不備を実機で確認**→`aws:branch`で0件時は分岐して丸ごとスキップする形に修正(ドキュメントv2)。過去日付に書き換えて自動復帰も確認
15. コンソールの「Rerun execution」は**元の実行と同じドキュメントバージョンを再利用する**(最新のデフォルトバージョンではない)ことが実機で判明。修正版を確実に使うには`aws ssm start-automation-execution --document-version <番号>`で明示指定する必要があった

### 運用報告書(2026-08-07〜08 実行分)

| 指標 | 値 | 算出根拠 |
|---|---|---|
| 適用率(Production) | 34%→100% | 適用前 Installed 28/Missing 54(≒34%) → 適用後 Installed 84/Missing 0 |
| 適用率(Canary) | 100%(変化なし) | 事前の単発検証で既に適用済みだったため、今回のロールアウトでは差分なし |
| Automation実行の失敗率 | 3/7 (43%) | 本日の全実行7回中、失敗3回(IAM権限不足2回+旧ドキュメントバージョンでの実行1回)。いずれもセットアップ起因で、権限修正・バージョン明示後は4回連続成功 |
| パッチ適用(Run Command)の失敗率 | 1/3 (33%) | Production向けInstall試行3回中、OOM起因の失敗1回。スワップ追加後は2回連続成功 |
| 未準拠台数 | 2台→0台 | ロールアウト前: Production 1台がNON_COMPLIANT(Canaryは事前検証で既にCOMPLIANT)。ロールアウト後: 両インスタンスともCOMPLIANT(重要度Critical/High件数も0) |

### 得られた知見

- `describe-instance-patch-states`のInstalled/MissingCountと、`list-resource-compliance-summaries`のCompliant/NonCompliantCountは近いが同一ではない値を返す(集計の粒度が異なる)。運用報告書は前者を「適用率」、後者を「準拠判定・重要度別」に使い分けるのが素直
- SSM Run Commandの標準出力は**24,000文字で切り捨てられる**。ログの結論部分(再起動の有無・エラーの核心)が切れて読めないことがあるため、`uptime`の前後比較のような別の裏取り手段を用意しておく必要がある
- `aws:runCommand`アクションには`CommandId`・`Status`等の予約済み出力名があり、同名で独自の`outputs`を定義すると`InvalidDocumentContent`になる。逆に言えば、これらは最初から自動的に使えるため、確認専用の別ステップ(`aws:executeAwsApi`でのGetCommandInvocation等)を重ねて書く必要が無い場合がある
- Quick Setup Patch Policyのタグベースターゲティングは1組(Key+Value)までしか追加できないが、Valueを空にすることで「Keyの存在だけを条件にする(値は問わない)」ターゲティングができる
- EventBridge Schedulerの実行ロールに`aws:SourceArn`/`aws:SourceAccount`のConditionを付けると、コンソールの「ロールが引き受け可能か」の事前検証がその文脈を渡さずに失敗する。公式ドキュメントのデフォルト例はConditition無しのシンプルな信頼ポリシーで、SourceArn制限は「本番運用で検討する追加の安全策」という位置づけ
- コンソールの「Rerun execution」は実行時点の最新デフォルトバージョンではなく、**元の実行が使ったドキュメントバージョンをそのまま再利用する**。ドキュメントを修正した直後に確実に新しい内容で試すには、CLIで`--document-version`を明示指定するのが確実
- `aws:branch`で対象リストが空になり得る設計(タグによる動的な除外)では、空リストのまま後続の`aws:runCommand`等に渡すとAPI側の`ValidationException`(要素数0のリストは受け付けない)でAutomation全体がクラッシュする。「対象0件」を正常系の一系統として扱い、専用の分岐でスキップさせる設計が必須
- t3.micro(メモリ1GB)でのパッチ適用は、AL2023のマイナーバージョン更新(`dnf update system-release`)のようなメモリを多く使う処理でOOM Killerに強制終了されることがある(returncode -9)。過去のGradleビルドOOMと同型の問題で、対策も同じ(スワップ追加)
- SNSのメール到達は前回セッションでは失敗したが、今回は同じGmailアドレスへの通知が実際に届いた。到達可否はAWS側から保証・追跡できないという結論自体は変わらないが、「届かない」と決めつけて設計するのも早計で、実際に届く場合もある

---

## 15. CloudWatch Alarm × OpsCenter × CloudTrail × Session Manager による一次対応フロー

**参照**: [Creating or editing an existing alarm from the console](https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-creating-or-editing-existing-alarm-console.html)、[Create OpsItems from CloudWatch Alarms](https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-create-OpsItems-from-CloudWatch-Alarms.html)、[Viewing CloudTrail events in the CloudTrail console](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html)、[Connect to your Linux instance with Session Manager](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-systems-manager-session-manager.html)、[Remediating OpsItems](https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-remediating.html)

異常検知→OpsItem起票→CloudTrail調査→Session Managerでの対象環境確認→復旧→正常化確認→対応記録、という一連の一次対応フローを、複数の公式チュートリアルを繋いで1つのシナリオとして実機で完走した。

### やったこと

1. 検証用EC2インスタンス(t3.micro・AL2023)を1台起動。IAMインスタンスプロファイルは既存の`AmazonSSMRoleForInstancesQuickSetup`を流用し、`describe-instance-information`でSSM管理下(`PingStatus: Online`)にあることを確認
2. CPUUtilizationのCloudWatch Alarmを作成。閾値は意図的に低く(10%・1分周期・1/1データポイント)設定し、アクションに「OpsItemを作成」(Systems Manager Action)のみを残し、Auto Scaling/EC2/通知/Lambdaの各アクションは削除
3. Session Managerでインスタンスに接続し、`nohup sh -c 'while true; do :; done' &`でバックグラウンド負荷を発生させ、`top`でCPU使用率上昇を確認
4. アラームが`ALARM`に遷移(実測: CPU 10.38%が閾値10.0を超過)すると同時にOpsItemが自動作成されることを`describe-alarms`/`describe-ops-items`で確認
5. CloudTrailのイベント履歴で直近の操作を調査。`StartSession`は`Username: tesuto`(人間の操作)、`CreateOpsItem`は`userIdentity.type: AssumedRole`(ロール`AWSServiceRoleForCloudWatchAlarms_ActionSSM`・`invokedBy: ssm.alarms.cloudwatch.amazonaws.com`)であることを確認し、不審な人為的操作が無いことを裏付け
6. Session Managerで再接続し、`top`で原因プロセス(PID)を特定して`kill`。CPU使用率が0%台まで下がったことを確認してセッション終了
7. CloudWatch Alarmが`OK`へ復帰したことを`get-metric-statistics`/`describe-alarms`で確認
8. OpsItemの説明欄に対応内容を記録し、ステータスを`Resolved`に変更(ステータス変更が1回目の保存で反映されず、再度編集し直す場面があった)
9. 検証用EC2インスタンスを終了、CloudWatch Alarmを削除し、`describe-instances`(`terminated`)・`describe-alarms`(該当なし)で課金対象ゼロを確認

### 運用報告書(2026-09-03 実行分)

| 指標 | 値 | 算出根拠 |
|---|---|---|
| MTTA相当(検知→調査開始) | 数分以内 | OpsItem作成(08:21:39)後、CloudTrail確認・Session Manager再接続まで連続して実施 |
| MTTR(検知→アラームOK復帰) | 10分00秒 | ALARM遷移(08:21:39)→OK復帰(08:31:39) |
| MTTR(検知→OpsItem解決) | 16分11秒 | ALARM遷移(08:21:39)→OpsItem Resolved(08:37:50) |
| CloudTrailでの不審操作 | 0件 | 期間中の関連イベントは`StartSession`(人間)と`CreateOpsItem`(CloudWatch Alarmのサービスロール)のみ |

### 得られた知見

- 最近のCloudWatch Alarm作成コンソールは、アラーム作成と同じ画面で「Systems Manager アクション」として「OpsItemを作成」を選べる。以前のバージョンの公式ドキュメントにある「既存アラームを後から編集してOpsItem連携を追加する」という手順を踏まなくても、新規作成時点で一体化できる
- CloudTrailの`Username`列だけでなく、生イベントの`userIdentity.type`を見ることで「人間の操作(`IAMUser`)」と「AWSサービスの自動アクション(`AssumedRole`+サービスリンクロール)」を明確に区別できる。今回は`invokedBy: ssm.alarms.cloudwatch.amazonaws.com`が付いており、CloudWatch Alarmが自分でSSMのAPIを呼んでいることが分かった
- CloudTrailはAWS API呼び出ししか記録しない。今回のCPU高負荷の原因(OS内部の`while true`ループ)はAWS APIを一切経由しないため、CloudTrail側には原因そのものは一切現れない。「CloudTrailで原因の全てが分かるわけではなく、OSレベルの調査(Session Manager接続)と役割分担がある」という境界線を実機で確認できた
- OpsItemの「解決済み」への変更は、コンソールの編集フォームで一度目の保存が反映されないことがあった(原因未特定だが、保存後に`get-ops-item`でCLI裏取りをして初めて未反映に気づけた)。ステータス変更のような重要な操作は、コンソールの見た目だけで完了と判断せず、CLIで確定させるのが安全
- CloudWatch Alarmの`OK`復帰とOpsItemの`Resolved`は別物で、前者が自動で戻っても後者は自動でクローズされない。一次対応の「対応内容を記録して終了」は、人間が明示的にOpsItemへ記録してクローズする作業として最後まで残る
- t3.microでも`while true; do :; done`のような単純な無限ループ1本で、1コアの使用率を100%近くまで専有できる(2vCPU環境全体では約50%表示)。検証用の負荷生成として十分に軽量かつ確実
