package com.reviewboard.reconciliation;

/**
 * 再計算バッチの結果（S-3）。補正した件数を種別ごとに保持する。
 * 0 件なら drift 無し（正常）。0 でなければ何かが同一 TX 更新からズレていた＝要観察。
 *
 * @param postReviewCount    posts.review_count を補正した件数
 * @param reviewThanksCount  reviews.thanks_count を補正した件数
 * @param userReceived       users.received_reviews_count を補正した件数
 * @param userGiven          users.given_reviews_count を補正した件数
 * @param userThanksReceived users.thanks_received_count を補正した件数
 */
public record ReconciliationResult(
        int postReviewCount,
        int reviewThanksCount,
        int userReceived,
        int userGiven,
        int userThanksReceived) {

    public int total() {
        return postReviewCount + reviewThanksCount + userReceived + userGiven + userThanksReceived;
    }
}
