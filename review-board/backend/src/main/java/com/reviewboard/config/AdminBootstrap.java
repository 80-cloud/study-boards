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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * 初期管理者(ADMIN)の bootstrap。本番デプロイ直後に「最初の1人」を安全に作るための仕組み。
 *
 * <p>動作（全プロファイル・冪等）：
 * <ul>
 *   <li>{@code BOOTSTRAP_ADMIN_EMAIL} / {@code BOOTSTRAP_ADMIN_PASSWORD} が未設定なら何もしない
 *       （機密ハードコード禁止・dev seeder と同方針）。テスト/通常起動では env 未設定＝skip。</li>
 *   <li>既に ADMIN が存在すれば何もしない（再起動で重複作成しない）。</li>
 *   <li>上記を満たすときだけ、初期 cohort と初期 ADMIN を1組だけ作成する。</li>
 * </ul>
 * 以降の cohort/アカウントは、この ADMIN が {@code /api/admin/**} から発行する。
 */
@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final CohortRepository cohortRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;
    private final String cohortName;

    public AdminBootstrap(UserRepository userRepository, CohortRepository cohortRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.bootstrap.admin-email:}") String adminEmail,
                          @Value("${app.bootstrap.admin-password:}") String adminPassword,
                          @Value("${app.bootstrap.cohort-name:管理}") String cohortName) {
        this.userRepository = userRepository;
        this.cohortRepository = cohortRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.cohortName = cohortName;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return; // env 未設定＝bootstrap しない
        }
        if (userRepository.existsByRole(UserRole.ADMIN)) {
            log.info("[admin bootstrap] ADMIN が既に存在するため skip");
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            log.warn("[admin bootstrap] email={} は既存のため初期 ADMIN を作成しません", email);
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        Cohort cohort = new Cohort();
        cohort.setName(cohortName);
        cohort.setCreatedAt(now);
        cohort = cohortRepository.save(cohort);

        User admin = new User();
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setDisplayName("管理者");
        admin.setRole(UserRole.ADMIN);
        admin.setCohortId(cohort.getId());
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        userRepository.save(admin);

        log.info("[admin bootstrap] 初期 ADMIN を作成しました（email={}, cohortId={}）", email, cohort.getId());
    }
}
