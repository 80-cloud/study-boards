package com.reviewboard.domain.admin;

import com.reviewboard.domain.admin.dto.AdminUserCreateRequest;
import com.reviewboard.domain.admin.dto.AdminUserResponse;
import com.reviewboard.domain.admin.dto.CohortCreateRequest;
import com.reviewboard.domain.admin.dto.CohortResponse;
import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 運用管理 API（★S軸・ADMIN 限定）。cohort 作成とアカウント発行。
 *
 * <p>クラス全体を {@code @PreAuthorize("hasRole('ADMIN')")} で保護し、受講生/講師の呼び出しを
 * 403 で弾く（権限昇格防止・F-EVAL-01 と同方針）。公開サインアップは設けず、アカウントは
 * 管理者発行に限定する（閉域モデルの維持・F-AUTH-02）。
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    /** cohort（期）を作成する。 */
    @PostMapping("/cohorts")
    public ResponseEntity<CohortResponse> createCohort(@Valid @RequestBody CohortCreateRequest request) {
        Cohort cohort = adminService.createCohort(request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(CohortResponse.from(cohort));
    }

    /** cohort 一覧（アカウント発行時の参照用）。 */
    @GetMapping("/cohorts")
    public List<CohortResponse> listCohorts() {
        return adminService.listCohorts().stream().map(CohortResponse::from).toList();
    }

    /** アカウントを発行する（email/表示名/ロール/cohort/初期パスワード）。 */
    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody AdminUserCreateRequest request) {
        User user = adminService.createUser(request.email(), request.displayName(),
                request.role(), request.cohortId(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(AdminUserResponse.from(user));
    }
}
