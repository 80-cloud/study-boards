package com.reviewboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * review-board バックエンドのエントリポイント。
 * 成長支援型レビューコミュニティ（クローズド・cohort 境界・S軸＝認可）。
 */
@SpringBootApplication
public class ReviewBoardApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReviewBoardApplication.class, args);
    }
}
