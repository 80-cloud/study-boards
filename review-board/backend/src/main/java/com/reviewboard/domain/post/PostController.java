package com.reviewboard.domain.post;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.post.dto.PostCreateRequest;
import com.reviewboard.domain.post.dto.PostResponse;
import com.reviewboard.domain.post.dto.PostSummaryResponse;
import com.reviewboard.domain.post.dto.PostUpdateRequest;
import com.reviewboard.storage.StorageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * 投稿 API（F-POST）。すべて認証必須（SecurityConfig の anyRequest().authenticated()）。
 * cohort 境界・所有者の判定は {@link PostService} に集約する（★S軸・認可の一元化）。
 */
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;
    private final StorageService storageService;

    public PostController(PostService postService, StorageService storageService) {
        this.postService = postService;
        this.storageService = storageService;
    }

    /** screenshotKey から表示用の署名付き URL を補って詳細レスポンスを組み立てる（SEC-8）。 */
    private PostResponse toResponse(Post post) {
        return PostResponse.from(post, storageService.presignedGetUrl(post.getScreenshotKey()));
    }

    /** F-POST-01 作成 */
    @PostMapping
    public ResponseEntity<PostResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                               @Valid @RequestBody PostCreateRequest request) {
        Post post = postService.create(principal, request);
        return ResponseEntity.created(URI.create("/api/posts/" + post.getId()))
                .body(toResponse(post));
    }

    /** F-POST-03 一覧（同 cohort・未削除・ページネーション） */
    @GetMapping
    public Slice<PostSummaryResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
                                           @PageableDefault(size = 20) Pageable pageable) {
        return postService.listForCohort(principal, pageable).map(PostSummaryResponse::from);
    }

    /** F-POST-03 単体取得 */
    @GetMapping("/{id}")
    public PostResponse get(@AuthenticationPrincipal AuthPrincipal principal,
                            @PathVariable Long id) {
        return toResponse(postService.get(principal, id));
    }

    /** F-POST-02 編集（所有者のみ） */
    @PutMapping("/{id}")
    public PostResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                               @PathVariable Long id,
                               @Valid @RequestBody PostUpdateRequest request) {
        return toResponse(postService.update(principal, id, request));
    }

    /** F-POST-02 論理削除（所有者のみ） */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable Long id) {
        postService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
