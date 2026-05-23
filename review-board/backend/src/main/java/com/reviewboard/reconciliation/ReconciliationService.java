package com.reviewboard.reconciliation;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.review.ThanksRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 非正規化カウンタの定期再計算（★S-3）。
 *
 * <p>カウンタ（posts.review_count／reviews.thanks_count／users の received/given/thanks_received）は
 * 操作と同一 TX で更新している（{@code ReviewService}）。それでも稀な競合・部分失敗・過去データ起因で
 * ズレうるため、**権威ソース（実テーブルの件数）から再計算して補正**する安全網を設ける。
 *
 * <p>補正が発生したら WARN で記録する（#121 の構造化ログに乗る）。ズレは「気づき」であって
 * 即障害ではないが、継続的に出るなら同一 TX 更新のバグを疑う手がかりになる。
 */
@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final ThanksRepository thanksRepository;

    public ReconciliationService(PostRepository postRepository, UserRepository userRepository,
                                 ReviewRepository reviewRepository, ThanksRepository thanksRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.thanksRepository = thanksRepository;
    }

    /**
     * 全カウンタを権威ソースから再計算し、ズレていれば補正する。
     * 管理エンティティの dirty checking で TX コミット時に UPDATE される。
     */
    @Transactional
    public ReconciliationResult reconcileAll() {
        int postFixed = 0;
        int reviewFixed = 0;
        int receivedFixed = 0;
        int givenFixed = 0;
        int thanksFixed = 0;

        for (Post post : postRepository.findAll()) {
            int expected = reviewRepository.countByPostIdAndDeletedAtIsNull(post.getId());
            if (post.getReviewCount() != expected) {
                logDrift("post.review_count", post.getId(), post.getReviewCount(), expected);
                post.setReviewCount(expected);
                postFixed++;
            }
        }

        for (Review review : reviewRepository.findAll()) {
            int expected = thanksRepository.countByReviewId(review.getId());
            if (review.getThanksCount() != expected) {
                logDrift("review.thanks_count", review.getId(), review.getThanksCount(), expected);
                review.setThanksCount(expected);
                reviewFixed++;
            }
        }

        for (User user : userRepository.findAll()) {
            int received = reviewRepository.countReceivedForAuthor(user.getId());
            if (user.getReceivedReviewsCount() != received) {
                logDrift("user.received_reviews_count", user.getId(), user.getReceivedReviewsCount(), received);
                user.setReceivedReviewsCount(received);
                receivedFixed++;
            }
            int given = reviewRepository.countByReviewerUserIdAndDeletedAtIsNull(user.getId());
            if (user.getGivenReviewsCount() != given) {
                logDrift("user.given_reviews_count", user.getId(), user.getGivenReviewsCount(), given);
                user.setGivenReviewsCount(given);
                givenFixed++;
            }
            int thanks = thanksRepository.countThanksReceivedByReviewer(user.getId());
            if (user.getThanksReceivedCount() != thanks) {
                logDrift("user.thanks_received_count", user.getId(), user.getThanksReceivedCount(), thanks);
                user.setThanksReceivedCount(thanks);
                thanksFixed++;
            }
        }

        ReconciliationResult result =
                new ReconciliationResult(postFixed, reviewFixed, receivedFixed, givenFixed, thanksFixed);
        if (result.total() == 0) {
            log.info("カウンタ再計算：drift なし（全件整合）");
        } else {
            log.warn("カウンタ再計算：{} 件を補正（post_review={} review_thanks={} received={} given={} thanks_received={}）",
                    result.total(), postFixed, reviewFixed, receivedFixed, givenFixed, thanksFixed);
        }
        return result;
    }

    private void logDrift(String counter, Long id, int was, int now) {
        log.warn("counter drift 検出：{} id={} {} → {}", counter, id, was, now);
    }
}
