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
