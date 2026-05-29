package com.reviewboard.domain.post;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.post.dto.BestReviewRequest;
import com.reviewboard.domain.post.dto.LikeResponse;
import com.reviewboard.domain.post.dto.PostCreateRequest;
import com.reviewboard.domain.post.dto.PostResponse;
import com.reviewboard.domain.post.dto.PostSummaryResponse;
import com.reviewboard.domain.post.dto.PostUpdateRequest;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.storage.StorageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 投稿 API（F-POST）。すべて認証必須（SecurityConfig の anyRequest().authenticated()）。
 * cohort 境界・所有者の判定は {@link PostService} に集約する（★S軸・認可の一元化）。
 */
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;
    private final StorageService storageService;
    private final UserRepository userRepository;
    private final PostLikeService postLikeService;
    private final PostLikeRepository postLikeRepository;

    public PostController(PostService postService, StorageService storageService,
                          UserRepository userRepository, PostLikeService postLikeService,
                          PostLikeRepository postLikeRepository) {
        this.postService = postService;
        this.storageService = storageService;
        this.userRepository = userRepository;
        this.postLikeService = postLikeService;
        this.postLikeRepository = postLikeRepository;
    }

    /** screenshotKey から署名付き URL を補い、閲覧者のいいね状態を添えて詳細レスポンスを組み立てる（SEC-8）。 */
    private PostResponse toResponse(Post post, AuthPrincipal principal) {
        boolean liked = postLikeRepository.existsByPostIdAndUserId(post.getId(), principal.userId());
        // 表示は実効キー（手動アップロード優先・無ければ自動サムネ。#218）
        return PostResponse.from(post, storageService.presignedGetUrl(post.getEffectiveScreenshotKey()), liked);
    }

    /** F-POST-01 作成 */
    @PostMapping
    public ResponseEntity<PostResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                               @Valid @RequestBody PostCreateRequest request) {
        Post post = postService.create(principal, request);
        return ResponseEntity.created(URI.create("/api/posts/" + post.getId()))
                .body(toResponse(post, principal));
    }

    /**
     * F-POST-03 一覧 ＋ F-SEARCH-01 検索 ＋ F-FILTER-01 絞り込み/並び替え（同 cohort・未削除）。
     * すべて任意パラメータ。未指定なら従来どおり新着降順の全件（cohort 内）。
     */
    @GetMapping
    public Slice<PostSummaryResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
                                           @RequestParam(required = false) String q,
                                           @RequestParam(required = false) java.util.List<ReviewAspect> aspects,
                                           @RequestParam(required = false) java.util.List<ReviewTone> tones,
                                           @RequestParam(required = false) RecruitStatus status,
                                           @RequestParam(defaultValue = "false") boolean unreviewed,
                                           @RequestParam(defaultValue = "false") boolean approved,
                                           @RequestParam(defaultValue = "newest") String sort,
                                           @PageableDefault(size = 20) Pageable pageable) {
        Slice<Post> slice = postService.search(principal, q, aspects, tones, status, unreviewed, approved, sort, pageable);
        java.util.List<Long> ids = slice.getContent().stream().map(Post::getId).toList();
        // 著者名・いいね済み集合はバッチ解決（N+1 回避）。スクショ URL は短命署名で都度補う（SEC-8）。
        Map<Long, String> authorNames = userRepository.findAllById(
                        slice.getContent().stream().map(Post::getAuthorUserId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, User::getDisplayName, (a, b) -> a));
        Set<Long> likedPostIds = ids.isEmpty() ? Set.of()
                : postLikeRepository.findByUserIdAndPostIdIn(principal.userId(), ids)
                    .stream().map(PostLike::getPostId).collect(Collectors.toSet());
        return slice.map(p -> PostSummaryResponse.from(
                p, authorNames.get(p.getAuthorUserId()),
                storageService.presignedGetUrl(p.getEffectiveScreenshotKey()),
                likedPostIds.contains(p.getId())));
    }

    /** F-POST-03 単体取得 */
    @GetMapping("/{id}")
    public PostResponse get(@AuthenticationPrincipal AuthPrincipal principal,
                            @PathVariable Long id) {
        return toResponse(postService.get(principal, id), principal);
    }

    /** いいね（👍）を付ける。更新後のいいね数＋押下状態を返す。 */
    @PostMapping("/{id}/like")
    public LikeResponse like(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return new LikeResponse(postLikeService.like(principal, id), true);
    }

    /** いいね（👍）を外す。 */
    @DeleteMapping("/{id}/like")
    public LikeResponse unlike(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return new LikeResponse(postLikeService.unlike(principal, id), false);
    }

    /** F-POST-02 編集（所有者のみ） */
    @PutMapping("/{id}")
    public PostResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                               @PathVariable Long id,
                               @Valid @RequestBody PostUpdateRequest request) {
        return toResponse(postService.update(principal, id, request), principal);
    }

    /** F-POST-02 論理削除（所有者のみ） */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable Long id) {
        postService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }

    /** #496 P5：30 秒以内なら復元（所有者のみ・期限超過は 404） */
    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restore(@AuthenticationPrincipal AuthPrincipal principal,
                                        @PathVariable Long id) {
        postService.restore(principal, id);
        return ResponseEntity.noContent().build();
    }

    /** F-REV-05 ベストレビュー選択（投稿者のみ・他人は 404） */
    @PutMapping("/{id}/best-review")
    public PostResponse selectBestReview(@AuthenticationPrincipal AuthPrincipal principal,
                                         @PathVariable Long id,
                                         @Valid @RequestBody BestReviewRequest request) {
        return toResponse(postService.selectBestReview(principal, id, request.reviewId()), principal);
    }
}
