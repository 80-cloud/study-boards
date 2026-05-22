package com.reviewboard.config;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/**
 * 開発環境専用のシードデータ（dev プロファイルのみ）。
 * users が空のときだけ cohort + 講師1 + 受講生1 を作成する。
 * パスワードは {@code SEED_PASSWORD} 環境変数から取得（未設定なら何もしない＝機密ハードコード禁止）。
 */
@Component
@Profile("dev")
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final CohortRepository cohortRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;

    public DevDataSeeder(CohortRepository cohortRepository, UserRepository userRepository,
                         PasswordEncoder passwordEncoder,
                         @Value("${SEED_PASSWORD:}") String seedPassword) {
        this.cohortRepository = cohortRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }
        if (seedPassword == null || seedPassword.isBlank()) {
            log.warn("[dev seed] SEED_PASSWORD 未設定のためシードをスキップしました");
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        Cohort cohort = new Cohort();
        cohort.setName("2026 期 A");
        cohort.setCreatedAt(now);
        cohort = cohortRepository.save(cohort);

        userRepository.save(newUser("teacher@example.com", "講師ティーチャー", UserRole.TEACHER, cohort.getId(), now));
        userRepository.save(newUser("student@example.com", "受講生スチューデント", UserRole.STUDENT, cohort.getId(), now));
        log.info("[dev seed] cohort + 講師/受講生 を作成しました（cohortId={}）", cohort.getId());
    }

    private User newUser(String email, String displayName, UserRole role, Long cohortId, OffsetDateTime now) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(seedPassword));
        user.setDisplayName(displayName);
        user.setRole(role);
        user.setCohortId(cohortId);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return user;
    }
}
