package com.reviewboard.domain.review;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.audit.AuditService;
import com.reviewboard.domain.audit.AuditTargetType;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.dto.ReplyResponse;
import com.reviewboard.domain.review.dto.ReviewCreateRequest;
import com.reviewboard.domain.review.dto.ReviewResponse;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * レビューのユースケース（F-REV）。★S軸：cohort 境界・自己レビュー禁止・所有者・ありがとう権限を
 * すべてバックエンドで検証する。可視性外は存在を漏らさず 404（IDOR 遮断）。
 */
@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewAxisCommentRepository axisCommentRepository;
    private final ThanksRepository thanksRepository;
    private final ReviewReplyRepository replyRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ReviewService(ReviewRepository reviewRepository,
                         ReviewAxisCommentRepository axisCommentRepository,
                         ThanksRepository thanksRepository,
                         ReviewReplyRepository replyRepository,
                         PostRepository postRepository,
                         UserRepository userRepository,
                         AuditService auditService) {
        this.reviewRepository = reviewRepository;
        this.axisCommentRepository = axisCommentRepository;
        this.thanksRepository = thanksRepository;
        this.replyRepository = replyRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    /** F-REV-01 作成。同 cohort の投稿のみ・自己レビュー禁止。 */
    @Transactional
    public ReviewResponse create(AuthPrincipal principal, Long postId, ReviewCreateRequest req) {
        Post post = visiblePost(principal, postId);
        if (post.getAuthorUserId().equals(principal.userId())) {
            throw new InvalidRequestException("自分の投稿にはレビューできません");
        }
        OffsetDateTime now = OffsetDateTime.now();
        Review review = new Review();
        review.setPostId(postId);
        review.setReviewerUserId(principal.userId());
        review.setGood(req.good());
        review.setImprovement(req.improvement());
        review.setCreatedAt(now);
        review.setUpdatedAt(now);
        reviewRepository.save(review);

        List<ReviewAxisComment> axisComments = saveAxisComments(review.getId(), req.axisComments());

        // 非正規化カウンタ更新（母 S-3。ズレは将来の定期再計算で補正）
        post.setReviewCount(post.getReviewCount() + 1);
        adjustCount(principal.userId(), 0, +1);            // reviewer の「したレビュー」
        adjustCount(post.getAuthorUserId(), +1, 0);        // author の「もらったレビュー」

        auditService.record(principal, AuditAction.REVIEW_CREATED, AuditTargetType.REVIEW, review.getId());

        User reviewer = userRepository.findById(principal.userId()).orElseThrow();
        return ReviewResponse.from(review, reviewer.getDisplayName(), reviewer.getRole(), axisComments);
    }

    /** F-REV-01/02 一覧。投稿が可視（同 cohort）でなければ 404。reviewer の role を含める。 */
    @Transactional(readOnly = true)
    public List<ReviewResponse> listForPost(AuthPrincipal principal, Long postId) {
        visiblePost(principal, postId);
        List<Review> reviews = reviewRepository.findByPostIdAndDeletedAtIsNull(postId);
        if (reviews.isEmpty()) {
            return List.of();
        }
        // N+1 回避：axis コメントと reviewer をまとめて引く（母 P-3）
        List<Long> reviewIds = reviews.stream().map(Review::getId).toList();
        Map<Long, List<ReviewAxisComment>> axisByReview = axisCommentRepository.findByReviewIdIn(reviewIds)
                .stream().collect(Collectors.groupingBy(ReviewAxisComment::getReviewId));
        Set<Long> reviewerIds = reviews.stream().map(Review::getReviewerUserId).collect(Collectors.toSet());
        Map<Long, User> reviewers = userRepository.findAllById(reviewerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return reviews.stream().map(r -> {
            User reviewer = reviewers.get(r.getReviewerUserId());
            return ReviewResponse.from(r,
                    reviewer != null ? reviewer.getDisplayName() : "(不明)",
                    reviewer != null ? reviewer.getRole() : null,
                    axisByReview.getOrDefault(r.getId(), List.of()));
        }).toList();
    }

    /** F-REV 編集（所有者のみ・不一致は 404）。観点別コメントは入れ替える。 */
    @Transactional
    public ReviewResponse update(AuthPrincipal principal, Long reviewId, ReviewCreateRequest req) {
        Review review = ownedReview(principal, reviewId);
        review.setGood(req.good());
        review.setImprovement(req.improvement());
        review.setUpdatedAt(OffsetDateTime.now());

        axisCommentRepository.deleteAll(axisCommentRepository.findByReviewId(reviewId));
        List<ReviewAxisComment> axisComments = saveAxisComments(reviewId, req.axisComments());

        User reviewer = userRepository.findById(principal.userId()).orElseThrow();
        return ReviewResponse.from(review, reviewer.getDisplayName(), reviewer.getRole(), axisComments);
    }

    /** F-REV 論理削除（所有者のみ）。カウンタも戻す。 */
    @Transactional
    public void delete(AuthPrincipal principal, Long reviewId) {
        Review review = ownedReview(principal, reviewId);
        review.setDeletedAt(OffsetDateTime.now());
        review.setUpdatedAt(OffsetDateTime.now());

        postRepository.findById(review.getPostId()).ifPresent(p -> {
            p.setReviewCount(Math.max(0, p.getReviewCount() - 1));
            adjustCount(p.getAuthorUserId(), -1, 0);
        });
        adjustCount(principal.userId(), 0, -1);
        auditService.record(principal, AuditAction.REVIEW_DELETED, AuditTargetType.REVIEW, reviewId);
    }

    /** F-REV-03 ありがとう（投稿者のみ・冪等）。reviewer の実績に反映。 */
    @Transactional
    public void thank(AuthPrincipal principal, Long reviewId) {
        Review review = reviewRepository.findByIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("review not found: " + reviewId));
        // レビュー先の投稿が自 cohort かつ未削除であること（可視性）
        Post post = visiblePost(principal, review.getPostId());
        // ありがとうを返せるのは投稿者のみ（F-REV-03）
        if (!post.getAuthorUserId().equals(principal.userId())) {
            throw new AccessDeniedException("ありがとうは投稿者のみ送れます");
        }
        // 冪等：既に送っていれば何もしない（uq_thanks）
        if (thanksRepository.existsByReviewIdAndFromUserId(reviewId, principal.userId())) {
            return;
        }
        Thanks thanks = new Thanks();
        thanks.setReviewId(reviewId);
        thanks.setFromUserId(principal.userId());
        thanks.setCreatedAt(OffsetDateTime.now());
        thanksRepository.save(thanks);

        review.setThanksCount(review.getThanksCount() + 1);
        adjustThanksReceived(review.getReviewerUserId(), +1);
        auditService.record(principal, AuditAction.THANKS_SENT, AuditTargetType.REVIEW, reviewId);
    }

    // ---- F-REV-04 返信（スレッド） ----

    /** 返信作成。レビュー先の投稿が自 cohort（可視）であること。同 cohort なら誰でも返信可。 */
    @Transactional
    public ReplyResponse createReply(AuthPrincipal principal, Long reviewId, String body) {
        Review review = visibleReview(principal, reviewId);
        OffsetDateTime now = OffsetDateTime.now();
        ReviewReply reply = new ReviewReply();
        reply.setReviewId(reviewId);
        reply.setReplierUserId(principal.userId());
        reply.setBody(body);
        reply.setCreatedAt(now);
        replyRepository.save(reply);

        review.setRepliesCount(review.getRepliesCount() + 1); // 非正規化（母 S-3）

        User replier = userRepository.findById(principal.userId()).orElseThrow();
        return ReplyResponse.from(reply, replier.getDisplayName());
    }

    /** 返信一覧（古い順）。レビューが可視でなければ 404。reviewer 名は N+1 回避でまとめ引き。 */
    @Transactional(readOnly = true)
    public List<ReplyResponse> listReplies(AuthPrincipal principal, Long reviewId) {
        visibleReview(principal, reviewId);
        List<ReviewReply> replies = replyRepository.findByReviewIdAndDeletedAtIsNullOrderByCreatedAtAsc(reviewId);
        if (replies.isEmpty()) {
            return List.of();
        }
        Set<Long> userIds = replies.stream().map(ReviewReply::getReplierUserId).collect(Collectors.toSet());
        Map<Long, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return replies.stream().map(r -> {
            User u = users.get(r.getReplierUserId());
            return ReplyResponse.from(r, u != null ? u.getDisplayName() : "(不明)");
        }).toList();
    }

    /** 返信の論理削除（投稿者本人のみ・他人/未存在は 404）。カウンタも戻す。 */
    @Transactional
    public void deleteReply(AuthPrincipal principal, Long replyId) {
        ReviewReply reply = replyRepository.findByIdAndDeletedAtIsNull(replyId)
                .orElseThrow(() -> new ResourceNotFoundException("reply not found: " + replyId));
        if (!reply.getReplierUserId().equals(principal.userId())) {
            throw new ResourceNotFoundException("not the owner: " + replyId);
        }
        reply.setDeletedAt(OffsetDateTime.now());
        reviewRepository.findByIdAndDeletedAtIsNull(reply.getReviewId())
                .ifPresent(rv -> rv.setRepliesCount(Math.max(0, rv.getRepliesCount() - 1)));
    }

    // ---- helpers ----

    /** レビューが可視（未削除＋投稿が自 cohort）であることを確認して返す。可視外は 404。 */
    private Review visibleReview(AuthPrincipal principal, Long reviewId) {
        Review review = reviewRepository.findByIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("review not found: " + reviewId));
        visiblePost(principal, review.getPostId()); // cohort 境界（404）
        return review;
    }

    /** 自 cohort・未削除の投稿を返す。可視性外は 404（IDOR 遮断）。 */
    private Post visiblePost(AuthPrincipal principal, Long postId) {
        return postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));
    }

    /** 未削除かつ自分が書いたレビューを返す。他人/未存在は 404。 */
    private Review ownedReview(AuthPrincipal principal, Long reviewId) {
        Review review = reviewRepository.findByIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("review not found: " + reviewId));
        if (!review.getReviewerUserId().equals(principal.userId())) {
            throw new ResourceNotFoundException("not the owner: " + reviewId);
        }
        return review;
    }

    private List<ReviewAxisComment> saveAxisComments(Long reviewId,
                                                     List<ReviewCreateRequest.AxisCommentInput> inputs) {
        if (inputs == null || inputs.isEmpty()) {
            return List.of();
        }
        Set<ReviewAxis> seen = new HashSet<>();
        List<ReviewAxisComment> entities = inputs.stream().map(in -> {
            if (!seen.add(in.axis())) {
                throw new InvalidRequestException("同じ観点軸のコメントは1つまでです: " + in.axis());
            }
            ReviewAxisComment c = new ReviewAxisComment();
            c.setReviewId(reviewId);
            c.setAxis(in.axis());
            c.setComment(in.comment());
            return c;
        }).toList();
        return axisCommentRepository.saveAll(entities);
    }

    private void adjustCount(Long userId, int receivedDelta, int givenDelta) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setReceivedReviewsCount(Math.max(0, u.getReceivedReviewsCount() + receivedDelta));
            u.setGivenReviewsCount(Math.max(0, u.getGivenReviewsCount() + givenDelta));
        });
    }

    private void adjustThanksReceived(Long userId, int delta) {
        userRepository.findById(userId).ifPresent(u ->
                u.setThanksReceivedCount(Math.max(0, u.getThanksReceivedCount() + delta)));
    }
}
