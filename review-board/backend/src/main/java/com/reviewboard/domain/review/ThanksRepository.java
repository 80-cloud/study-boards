package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ThanksRepository extends JpaRepository<Thanks, Long> {

    boolean existsByReviewIdAndFromUserId(Long reviewId, Long fromUserId);
}
