package com.reviewboard.domain.evaluation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    /** 投稿の最新評価（合格バッジ判定・F-PROF-04） */
    Optional<Evaluation> findByPostIdAndLatestIsTrue(Long postId);

    /** 投稿の評価履歴（新しい順。母 S-4 履歴保持） */
    List<Evaluation> findByPostIdOrderByCreatedAtDesc(Long postId);

    /** 成長記録（F-PROF-04）：複数投稿の最新評価をまとめて取得（合格バッジ判定・N+1回避） */
    List<Evaluation> findByPostIdInAndLatestIsTrue(List<Long> postIds);
}
