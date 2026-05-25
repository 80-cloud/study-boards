package com.reviewboard.domain.mfa;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, Long> {

    /** ハッシュで1件引く（ログイン2段目の照合）。 */
    Optional<MfaRecoveryCode> findByCodeHash(String codeHash);

    /** 当該ユーザーの未使用コード数（残数表示・警告判定）。 */
    long countByUserIdAndUsedAtIsNull(Long userId);

    /** 当該ユーザーの全コード（regenerate / disable で破棄）。 */
    List<MfaRecoveryCode> findAllByUserId(Long userId);

    void deleteAllByUserId(Long userId);
}
