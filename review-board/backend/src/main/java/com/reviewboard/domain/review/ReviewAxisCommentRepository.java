package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewAxisCommentRepository extends JpaRepository<ReviewAxisComment, Long> {

    List<ReviewAxisComment> findByReviewId(Long reviewId);

    List<ReviewAxisComment> findByReviewIdIn(List<Long> reviewIds);
}
