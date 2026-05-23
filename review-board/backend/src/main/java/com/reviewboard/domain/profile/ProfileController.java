package com.reviewboard.domain.profile;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.profile.dto.ProfileResponse;
import com.reviewboard.domain.profile.dto.ProfileUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 成長記録ページ API（F-PROF・主役）。認証必須・同 cohort のメンバーのみ閲覧可。
 */
@RestController
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /** F-PROF 成長記録（投稿履歴・もらったレビュー・実績数・合格バッジ） */
    @GetMapping("/api/users/{userId}/profile")
    public ProfileResponse getProfile(@AuthenticationPrincipal AuthPrincipal principal,
                                      @PathVariable Long userId) {
        return profileService.getProfile(principal, userId);
    }

    /** F-PROF（S-04）プロフィール編集（本人のみ・bio＋アバター）。principal から導出するため他人は編集不可。 */
    @PutMapping("/api/users/me/profile")
    public ProfileResponse updateMyProfile(@AuthenticationPrincipal AuthPrincipal principal,
                                           @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateOwnProfile(principal, request.bio(), request.avatarKey());
    }
}
