package com.reviewboard.domain.post;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 検索・絞り込み・並び替え（F-SEARCH-01 / F-FILTER-01）の検証。
 * ★cohort 境界（IDOR 遮断）が検索でも崩れないことを必ず確認する。
 */
class PostSearchIntegrationTest extends AbstractIntegrationTest {

    private Cookie cookieA;

    @BeforeEach
    void seed() throws Exception {
        var cohortA = newCohort("A");
        var cohortB = newCohort("B");
        var studentA = newUser("a@example.com", UserRole.STUDENT, cohortA.getId());
        var studentB = newUser("b@example.com", UserRole.STUDENT, cohortB.getId());

        // cohort A の投稿（属性を変えて作る）
        newPost(studentA.getId(), cohortA.getId(), "Spring Boot 入門", "Java の REST API", RecruitStatus.OPEN, 0);
        newPost(studentA.getId(), cohortA.getId(), "React Tips", "フロントの小ネタ", RecruitStatus.CLOSED, 5);
        newPost(studentA.getId(), cohortA.getId(), "DB 設計", "PostgreSQL と Spring Data", RecruitStatus.OPEN, 2);
        // cohort B に「Spring」を含む投稿（A の検索に漏れてはならない）
        newPost(studentB.getId(), cohortB.getId(), "Spring Boot 別期", "他 cohort の投稿", RecruitStatus.OPEN, 0);

        cookieA = login("a@example.com");
    }

    /** F-SEARCH-01：キーワードはタイトル/説明の部分一致。★他 cohort の一致投稿は出ない。 */
    @Test
    void search_matches_within_cohort_only() throws Exception {
        mockMvc.perform(get("/api/posts").param("q", "spring").cookie(cookieA))
                .andExpect(status().isOk())
                // "Spring Boot 入門"（title 一致）と "DB 設計"（説明に "Spring Data"）の2件。cohort B の Spring は除外。
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[?(@.title == 'Spring Boot 別期')]").doesNotExist());
    }

    /** F-FILTER-01：募集状態で絞る。 */
    @Test
    void filter_by_recruit_status() throws Exception {
        mockMvc.perform(get("/api/posts").param("status", "OPEN").cookie(cookieA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2)) // Spring Boot 入門 / DB 設計
                .andExpect(jsonPath("$.content[?(@.recruitStatus == 'CLOSED')]").doesNotExist());
    }

    /** F-FILTER-01：未レビュー（review_count=0）のみ。 */
    @Test
    void filter_unreviewed_only() throws Exception {
        mockMvc.perform(get("/api/posts").param("unreviewed", "true").cookie(cookieA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1)) // Spring Boot 入門 のみ
                .andExpect(jsonPath("$.content[0].title").value("Spring Boot 入門"));
    }

    /** F-FILTER-01：レビュー数の多い順。 */
    @Test
    void sort_by_review_count_desc() throws Exception {
        mockMvc.perform(get("/api/posts").param("sort", "reviews").cookie(cookieA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("React Tips")) // 5 件
                .andExpect(jsonPath("$.content[1].title").value("DB 設計"));    // 2 件
    }

    /** 既定（パラメータ無し）は cohort 内全件・新着降順。 */
    @Test
    void default_returns_all_in_cohort() throws Exception {
        mockMvc.perform(get("/api/posts").cookie(cookieA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3));
    }

    private void newPost(Long authorId, Long cohortId, String title, String desc,
                         RecruitStatus status, int reviewCount) {
        OffsetDateTime now = OffsetDateTime.now();
        Post p = new Post();
        p.setAuthorUserId(authorId);
        p.setCohortId(cohortId);
        p.setTitle(title);
        p.setDescription(desc);
        p.setRecruitStatus(status);
        p.setReviewCount(reviewCount);
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        postRepository.save(p);
    }
}
