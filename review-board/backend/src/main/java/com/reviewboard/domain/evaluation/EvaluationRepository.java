package com.reviewboard.domain.evaluation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    /** 投稿の最新評価（合格バッジ判定・F-PROF-04） */
    Optional<Evaluation> findByPostIdAndLatestIsTrue(Long postId);
}
