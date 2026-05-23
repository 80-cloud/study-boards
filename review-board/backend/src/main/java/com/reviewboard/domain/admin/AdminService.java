package com.reviewboard.domain.admin;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 運用管理（ADMIN 限定）。cohort 作成とアカウント発行。
 * 認可（hasRole('ADMIN')）はコントローラ層で担保し、本サービスは整合性を検証する。
 */
@Service
public class AdminService {

    private final CohortRepository cohortRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(CohortRepository cohortRepository, UserRepository userRepository,
                        PasswordEncoder passwordEncoder) {
        this.cohortRepository = cohortRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Cohort createCohort(String name) {
        Cohort cohort = new Cohort();
        cohort.setName(name.trim());
        cohort.setCreatedAt(OffsetDateTime.now());
        return cohortRepository.save(cohort);
    }

    @Transactional(readOnly = true)
    public List<Cohort> listCohorts() {
        return cohortRepository.findAll();
    }

    /**
     * アカウントを発行する。email は一意・cohort は実在必須。
     * パスワードは bcrypt でハッシュ化して保存（平文は保持しない）。
     */
    @Transactional
    public User createUser(String email, String displayName, UserRole role, Long cohortId, String rawPassword) {
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new InvalidRequestException("この email は既に使われています");
        }
        if (!cohortRepository.existsById(cohortId)) {
            throw new ResourceNotFoundException("指定の cohort が見つかりません");
        }

        OffsetDateTime now = OffsetDateTime.now();
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setDisplayName(displayName.trim());
        user.setRole(role);
        user.setCohortId(cohortId);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return userRepository.save(user);
    }
}
