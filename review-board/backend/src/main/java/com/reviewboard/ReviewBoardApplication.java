package com.reviewboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * review-board バックエンドのエントリポイント。
 * 成長支援型レビューコミュニティ（クローズド・cohort 境界・S軸＝認可）。
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling // S-3 カウンタ再計算バッチ等の定期実行
@EnableAsync      // メール通知（#175）を TX 後に別スレッドで送る
public class ReviewBoardApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReviewBoardApplication.class, args);
    }
}
