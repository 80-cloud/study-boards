package com.reviewboard.reconciliation;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.Thanks;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 非正規化カウンタの定期再計算（★S-3）の検証。
 * 意図的に counter をズラし、権威ソース（実テーブルの件数）どおりに補正されることを確認する。
 */
class ReconciliationIntegrationTest extends AbstractIntegrationTest {

    @Autowired ReconciliationService reconciliationService;

    @Test
    void drift_is_detected_and_corrected_from_source() {
        var cohort = newCohort("A");
        User author = newUser("author@example.com", UserRole.STUDENT, cohort.getId());
        User reviewer = newUser("reviewer@example.com", UserRole.STUDENT, cohort.getId());

        Post post = newPost(author.getId(), cohort.getId());
        // reviewer が author の投稿に未削除レビュー2件＋削除済み1件
        Review r1 = newReview(post.getId(), reviewer.getId(), false);
        newReview(post.getId(), reviewer.getId(), false);
        newReview(post.getId(), reviewer.getId(), true); // 削除済み（数えない）
        // r1 に ありがとう1件
        newThanks(r1.getId(), author.getId());

        // ★カウンタを意図的に壊す（権威ソースとズラす）
        post.setReviewCount(99);
        postRepository.save(post);
        r1.setThanksCount(42);
        reviewRepository.save(r1);
        author.setReceivedReviewsCount(0);   // 正は 2
        author.setGivenReviewsCount(7);      // 正は 0
        reviewer.setGivenReviewsCount(0);    // 正は 2
        reviewer.setThanksReceivedCount(0);  // 正は 1
        userRepository.save(author);
        userRepository.save(reviewer);

        ReconciliationResult result = reconciliationService.reconcileAll();

        // 補正件数：post.review_count(1)+review.thanks_count(1)+received(1)+given(author,reviewer=2)+thanks_received(1)=6
        assertThat(result.total()).isEqualTo(6);

        // 権威ソースどおりに直っていること
        assertThat(postRepository.findById(post.getId()).orElseThrow().getReviewCount()).isEqualTo(2);
        assertThat(reviewRepository.findById(r1.getId()).orElseThrow().getThanksCount()).isEqualTo(1);
        User a = userRepository.findById(author.getId()).orElseThrow();
        assertThat(a.getReceivedReviewsCount()).isEqualTo(2);
        assertThat(a.getGivenReviewsCount()).isEqualTo(0);
        User rv = userRepository.findById(reviewer.getId()).orElseThrow();
        assertThat(rv.getGivenReviewsCount()).isEqualTo(2);
        assertThat(rv.getThanksReceivedCount()).isEqualTo(1);
    }

    @Test
    void consistent_data_yields_no_corrections() {
        var cohort = newCohort("A");
        User author = newUser("author@example.com", UserRole.STUDENT, cohort.getId());
        Post post = newPost(author.getId(), cohort.getId()); // review_count 0・レビューなし＝整合

        ReconciliationResult result = reconciliationService.reconcileAll();

        assertThat(result.total()).isZero();
    }

    // ---- ヘルパー（権威ソースの行を直接作る） ----

    private Post newPost(Long authorId, Long cohortId) {
        OffsetDateTime now = OffsetDateTime.now();
        Post p = new Post();
        p.setAuthorUserId(authorId);
        p.setCohortId(cohortId);
        p.setTitle("作品");
        p.setDescription("説明");
        p.setRecruitStatus(RecruitStatus.OPEN);
        p.setReviewCount(0);
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        return postRepository.save(p);
    }

    private Review newReview(Long postId, Long reviewerId, boolean deleted) {
        OffsetDateTime now = OffsetDateTime.now();
        Review r = new Review();
        r.setPostId(postId);
        r.setReviewerUserId(reviewerId);
        r.setGood("良い点");
        r.setImprovement("改善点");
        r.setThanksCount(0);
        r.setCreatedAt(now);
        r.setUpdatedAt(now);
        if (deleted) {
            r.setDeletedAt(now);
        }
        return reviewRepository.save(r);
    }

    private void newThanks(Long reviewId, Long fromUserId) {
        Thanks t = new Thanks();
        t.setReviewId(reviewId);
        t.setFromUserId(fromUserId);
        t.setCreatedAt(OffsetDateTime.now());
        thanksRepository.save(t);
    }
}
