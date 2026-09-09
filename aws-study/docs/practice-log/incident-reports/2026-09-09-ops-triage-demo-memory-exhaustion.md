# 障害対応報告書

## 概要
- 発生日時: 2026-09-09 15:26頃(JST・推定)
- 検知日時: 2026-09-09 15:28:38(JST・CloudWatch Alarm「ops-triage-demo-cpu-high」ALARM遷移)
- 復旧日時: 2026-09-09 15:49〜15:50(JST・全4アラームがOK復帰)
- 影響範囲: Webサービス(`http://ops-triage-demo-alb-1097987437.ap-northeast-1.elb.amazonaws.com`)への接続不可、および対象EC2インスタンスへの運用アクセス(SSM経由)全断
- 重要度: 高(サービス影響あり・かつ通常の調査手段が使用不能になった)

## 発生
ブラインド障害切り分け演習の一環として、対象EC2インスタンスに対しメモリを約700MB確保するプロセスを注入した。当初は「安全に観測できる負荷」として設計された注入だったが、実機では想定を超えてシステム全体が深刻な状態に陥った。

## 確認
CloudWatch Alarm「ops-triage-demo-cpu-high」が15:28:38にALARM状態に遷移。通常のブラインド演習の手順に従い、CloudWatchアラーム一覧・Session Manager経由でのOS調査を試みた。

## 調査
- Session Manager経由での接続・SSM Run Commandによるコマンド実行が、送信から数分経過しても一切応答しない状態を確認
- `aws ssm describe-instance-information`でPingStatusを確認したところ`ConnectionLost`となっており、最終応答時刻(LastPingDateTime)が注入直後の時刻で止まっていた
- 一方`aws ec2 describe-instance-status`で確認したEC2標準ステータスチェック(System/Instance/AttachedEBS)は3項目とも終始`ok`のままで、異常を検知していなかった
- 外部からの`curl`は接続タイムアウト(HTTPステータス000)、ALB Target Healthも`unhealthy`(Reason: `Target.Timeout` = ヘルスチェック自体が無応答)に変化しており、単なるアプリケーション層の異常ではなくOS全体が応答不能になっていると判断
- CloudWatch Alarmの状態遷移履歴を後から確認したところ、`mem-high`・`disk-high`アラームは15:32頃に相次いで`INSUFFICIENT_DATA`へ遷移しており、CloudWatch Agent自身もこの時点までに応答を失っていたことが判明した
- ローカル端末から直接`aws ssm start-session`を試みたが(`session-manager-plugin`を新規インストールした上で実行)、こちらも接続後にシェルプロンプトが一切返らず、同様に無応答だった

## 対応
SSM経由の手段(Run Command・Session Manager双方)がいずれも使用不能と判断し、EC2コンソールから対象インスタンスの**再起動**を実施した(データを失わない通常の復旧操作であり、破壊的な操作ではない)。

## 復旧確認
- 再起動後、`aws ssm describe-instance-information`でPingStatusが`Online`に復帰したことを確認
- SSM Run Commandで`free -h`・`ps aux`・`systemctl status nginx`を実行し、注入したプロセスが残っていないこと(再起動により消滅)、メモリ使用量が平常値(213MiB/913MiB)に戻っていること、nginxがsystemdの`enabled`設定により自動起動し`active (running)`であることを確認
- 外部からの`curl`で200 OKを確認、ALB Target Healthが`healthy`に復帰
- CloudWatch Alarm 4種(`unhealthy-host`・`cpu-high`・`mem-high`・`disk-high`)が15:49:06〜15:50:40の間に順次OKへ復帰したことを確認

## 再発防止
今回はブラインド演習における意図的な負荷注入が想定より深刻化した事象であり、実運用環境で同種の負荷が偶発的に発生した場合を想定した再発防止策を検討する:
- インスタンスタイプのメモリ容量に対して確保する割合を、演習設計段階でより保守的に見積もる(今回は913MiBに対し700MB=約77%を狙ったが、OSベースライン使用分と合わせて実質的な余裕がほぼ無かった)
- 本番運用であれば、OOM発生時にプロセスを強制終了させる仕組み(`systemd`の`MemoryMax`によるcgroup制限、またはOOMスコア調整)をアプリケーション側にあらかじめ設定し、OS全体ではなく特定プロセスの強制終了で収まるようにする
- CloudWatch Agent自体の死活を監視する二次的な仕組み(例: エージェントプロセスの生存確認をEC2標準メトリクス以外の手段で行う)を検討する。今回のようにOS全体が応答不能になると、監視の目そのものが失われるため
- SSM経由の手段が全滅した場合の最終手段(EC2コンソールからの再起動)を、運用手順としてあらかじめ明文化しておく

## 対応時間
- 検知(cpu-high ALARM)〜復旧完了(全アラームOK復帰): 約21分(15:28:38〜15:49:38の最終アラームOK復帰まで)
- 推定注入〜復旧完了: 約23〜24分(15:26頃〜15:50頃)
