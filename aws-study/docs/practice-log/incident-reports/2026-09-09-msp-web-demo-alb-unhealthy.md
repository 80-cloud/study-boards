# 障害対応報告書

## 概要
- 発生日時: 2026-09-09 12:48(JST)
- 検知日時: 2026-09-09 12:52(JST)
- 復旧日時: 2026-09-09 13:03(JST・CloudWatch AlarmのOK復帰時刻)
- 影響範囲: Webサービス(`http://msp-web-demo-alb-109948665.ap-northeast-1.elb.amazonaws.com`)への接続不可
- 重要度: 高(顧客影響あり・重要度2)

## 発生
CloudWatch Alarm「msp-web-demo-unhealthy-host」がALARM状態に遷移し、Systems Manager OpsCenterにOpsItemが自動作成された(アラーム遷移からOpsItem作成までの遅延は0.14秒とほぼ同時)。

## 確認
Application Load BalancerのTarget Health Checkにて、対象EC2インスタンスがUnhealthy判定であることを確認した。

## 調査
Session Manager経由でインスタンスに接続し、`systemctl status nginx`にてExecStart/Main PIDともに正常終了コード(`status=0/SUCCESS`)であることを確認、続けて`journalctl -u nginx`にて「Stopping → Deactivated successfully → Stopped」という正常な停止シーケンスのログを確認した。これにより、プロセスの異常終了(クラッシュ・メモリ不足等)ではなく、サービスが明示的に停止されたことが判明した。

CloudTrailの直近の操作履歴を確認し、対象リソースに関するAWS API操作は本人によるステータス更新(`UpdateOpsItem`)のみで、インフラ構成側の意図しない変更が原因ではないことを確認した。

## 対応
nginxサービスを再起動し、正常に起動したことを確認した。

## 復旧確認
- インスタンス内からのHTTPリクエストで200 OKを確認
- ALB Target HealthがHealthyに復帰したことを確認
- CloudWatch AlarmがOK状態に復帰したことを確認(ALARM遷移から11分00秒後)

## 再発防止
今回はデモ環境での意図的な停止による検証のため、恒久対応は不要。実運用に適用する場合は、以下を検討する:
- OpsItemの「Runbooks」からのAutomationランブック実行によるnginx自動復旧(手動対応の代替)
- プロセス監視(CloudWatch Agentでのnginxプロセス死活監視)の追加

## 対応時間
- 検知〜復旧完了(Alarm OK復帰まで): 11分00秒
- 検知〜対応記録完了(OpsItem Resolved): 13分43秒
