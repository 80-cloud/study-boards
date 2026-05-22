package com.reviewboard.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    /** cohort 境界での取得（IDOR 防止。プロフィール閲覧は同 cohort のみ） */
    Optional<User> findByIdAndCohortId(Long id, Long cohortId);
}
