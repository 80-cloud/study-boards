package com.reviewboard.domain.post;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * F-SAFE-01 心理的安全設定 ＋ F-REQ-01 観点別レビュー依頼の統合テスト。
 *
 * <p>新規エンドポイントは無く、既存 POST/PUT /api/posts に相乗りする（認可境界は据え置き）。
 * セキュリティ標準として「設定は所有者のみ・他人の更新は 404・他 cohort は不可視（404）・不正 enum は 400」を確認する。
 */
class PostReviewPreferenceIntegrationTest extends AbstractIntegrationTest {

    private String authorEmail;
    private String otherEmail;
    private long cohortId;

    @BeforeEach
    void seed() throws Exception {
        var cohort = newCohort("A");
        cohortId = cohort.getId();
        authorEmail = newUser("author@example.com", UserRole.STUDENT, cohortId).getEmail();
        otherEmail = newUser("other@example.com", UserRole.STUDENT, cohortId).getEmail();
    }

    /** 作成時にトーン（複数可）・観点を設定でき、詳細取得で返る。 */
    @Test
    void create_with_tones_and_aspects_persists() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\",\"reviewTones\":[\"GENTLE\",\"DETAILED\"],\"reviewAspects\":[\"DB\",\"SECURITY\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewTones", org.hamcrest.Matchers.containsInAnyOrder("GENTLE", "DETAILED")))
                .andExpect(jsonPath("$.reviewAspects", org.hamcrest.Matchers.containsInAnyOrder("DB", "SECURITY")))
                .andReturn();
        long id = readId(res);

        mockMvc.perform(get("/api/posts/" + id).cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewTones", org.hamcrest.Matchers.containsInAnyOrder("GENTLE", "DETAILED")))
                .andExpect(jsonPath("$.reviewAspects", org.hamcrest.Matchers.containsInAnyOrder("DB", "SECURITY")));
    }

    /** 未指定なら未設定（空配列）で作成できる。 */
    @Test
    void create_without_preferences_defaults_to_unset() throws Exception {
        mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewTones").isEmpty())
                .andExpect(jsonPath("$.reviewAspects").isEmpty());
    }

    /** 所有者は更新で全置換できる（トーン複数入れ替え・観点入れ替え）。 */
    @Test
    void owner_can_update_preferences() throws Exception {
        long id = createPost(login(authorEmail), "{\"title\":\"作品\",\"description\":\"説明\",\"reviewTones\":[\"HARSH_OK\"],\"reviewAspects\":[\"CODE\"]}");

        mockMvc.perform(put("/api/posts/" + id).cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\",\"reviewTones\":[\"WELCOME_BEGINNER\",\"QUICK_OK\"],\"reviewAspects\":[\"UI\",\"PERFORMANCE\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewTones", org.hamcrest.Matchers.containsInAnyOrder("WELCOME_BEGINNER", "QUICK_OK")))
                .andExpect(jsonPath("$.reviewAspects", org.hamcrest.Matchers.containsInAnyOrder("UI", "PERFORMANCE")));
    }

    /** ★非所有者は更新できない（存在を漏らさず 404）。 */
    @Test
    void non_owner_cannot_update_returns404() throws Exception {
        long id = createPost(login(authorEmail), "{\"title\":\"作品\",\"description\":\"説明\",\"reviewTones\":[\"GENTLE\"]}");
        mockMvc.perform(put("/api/posts/" + id).cookie(login(otherEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"乗っ取り\",\"description\":\"説明\",\"reviewTones\":[\"HARSH_OK\"]}"))
                .andExpect(status().isNotFound());
    }

    /** 他 cohort からは投稿自体が不可視（404）。 */
    @Test
    void other_cohort_cannot_read_returns404() throws Exception {
        long id = createPost(login(authorEmail), "{\"title\":\"作品\",\"description\":\"説明\",\"reviewAspects\":[\"DB\"]}");
        var cohortB = newCohort("B");
        String outsider = newUser("out@example.com", UserRole.STUDENT, cohortB.getId()).getEmail();
        mockMvc.perform(get("/api/posts/" + id).cookie(login(outsider)))
                .andExpect(status().isNotFound());
    }

    /** AI使用状況タグ（#172）：作成で設定でき詳細で返り、更新で変更・null で未申告に戻せる。 */
    @Test
    void aiUsage_create_persists_update_and_clear() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\",\"aiUsage\":\"NONE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.aiUsage").value("NONE"))
                .andReturn();
        long id = readId(res);

        // 詳細取得で返る
        mockMvc.perform(get("/api/posts/" + id).cookie(login(authorEmail)))
                .andExpect(jsonPath("$.aiUsage").value("NONE"));

        // 更新で変更できる
        mockMvc.perform(put("/api/posts/" + id).cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\",\"aiUsage\":\"PARTIAL\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiUsage").value("PARTIAL"));

        // null（未指定）で未申告に戻る
        mockMvc.perform(put("/api/posts/" + id).cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiUsage").doesNotExist());
    }

    /** 不正な aiUsage enum 値は 400。 */
    @Test
    void invalid_aiUsage_value_returns400() throws Exception {
        mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\",\"aiUsage\":\"NOPE\"}"))
                .andExpect(status().isBadRequest());
    }

    /** 不正な enum 値（観点）は 400（HttpMessageNotReadable → InvalidRequest）。 */
    @Test
    void invalid_aspect_value_returns400() throws Exception {
        mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\",\"reviewAspects\":[\"NOPE\"]}"))
                .andExpect(status().isBadRequest());
    }

    private long createPost(Cookie cookie, String body) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
