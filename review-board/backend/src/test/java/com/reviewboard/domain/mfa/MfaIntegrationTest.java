package com.reviewboard.domain.mfa;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * C-6 二要素認証（TOTP・#235）。setup→enable→2段階ログインの正常系と、拒否系（誤コード・チャレンジ欠落・
 * 無効ユーザー）を検証する。TOTP コードはライブラリの CodeGenerator で算出する。
 */
class MfaIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL = "mfa@example.com";
    private final DefaultCodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final SystemTimeProvider timeProvider = new SystemTimeProvider();

    @BeforeEach
    void seed() {
        Cohort a = newCohort("A");
        newUser(EMAIL, UserRole.STUDENT, a.getId());
    }

    private String currentCode(String secret) throws Exception {
        return codeGenerator.generate(secret, timeProvider.getTime() / 30);
    }

    /** setup→enable で TOTP を有効化し、生成した secret を返す（access cookie で認証）。 */
    private String setupAndEnable(Cookie access) throws Exception {
        MvcResult setup = mockMvc.perform(post("/api/auth/mfa/setup").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrDataUri").exists())
                // #239 QR 一本化：生シークレット・otpauth URI は API で返さない。
                .andExpect(jsonPath("$.secret").doesNotExist())
                .andExpect(jsonPath("$.otpauthUri").doesNotExist())
                .andReturn();
        assertThat(JsonPath.<String>read(setup.getResponse().getContentAsString(), "$.qrDataUri"))
                .startsWith("data:image");
        // コード生成用のシークレットは QR に内包される。テストは DB から取得して算出する。
        String secret = userRepository.findByEmail(EMAIL).orElseThrow().getTotpSecret();

        mockMvc.perform(post("/api/auth/mfa/enable").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isNoContent());
        return secret;
    }

    private MvcResult passwordLogin(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andReturn();
    }

    /** 有効化前は従来どおり1段階でログインできる（mfaEnabled=false が応答に出る）。 */
    @Test
    void login_is_single_step_when_mfa_disabled() throws Exception {
        MvcResult res = passwordLogin(EMAIL);
        assertThat(res.getResponse().getStatus()).isEqualTo(200);
        assertThat(res.getResponse().getCookie("access_token")).isNotNull();
        assertThat(JsonPath.<Boolean>read(res.getResponse().getContentAsString(), "$.mfaEnabled")).isFalse();
    }

    /** 有効化後：password ログインは access を出さず mfaRequired＋チャレンジ Cookie を返す。 */
    @Test
    void login_requires_second_factor_after_enable() throws Exception {
        Cookie access = login(EMAIL);
        setupAndEnable(access);

        MvcResult res = passwordLogin(EMAIL);
        assertThat(res.getResponse().getStatus()).isEqualTo(200);
        assertThat(res.getResponse().getCookie("access_token")).isNull();
        assertThat(res.getResponse().getCookie("mfa_token")).isNotNull();
        assertThat(JsonPath.<Boolean>read(res.getResponse().getContentAsString(), "$.mfaRequired")).isTrue();
    }

    /** 2段階フル：password→正しい TOTP で access が発行される。 */
    @Test
    void full_two_step_login_succeeds_with_correct_code() throws Exception {
        Cookie access = login(EMAIL);
        String secret = setupAndEnable(access);

        Cookie mfa = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        assertThat(mfa).isNotNull();

        MvcResult res = mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaEnabled").value(true))
                .andReturn();
        assertThat(res.getResponse().getCookie("access_token")).isNotNull();
    }

    /** 誤った TOTP コードでは 2段目が 401。 */
    @Test
    void wrong_code_at_second_step_is_401() throws Exception {
        Cookie access = login(EMAIL);
        setupAndEnable(access);
        Cookie mfa = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");

        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa)
                        .contentType("application/json")
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** チャレンジ Cookie が無いと 2段目は 401。 */
    @Test
    void missing_challenge_cookie_is_401() throws Exception {
        mockMvc.perform(post("/api/auth/login/mfa")
                        .contentType("application/json")
                        .content("{\"code\":\"123456\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** enable に誤コードを出すと 400（有効化されない）。 */
    @Test
    void enable_with_wrong_code_is_400() throws Exception {
        Cookie access = login(EMAIL);
        mockMvc.perform(post("/api/auth/mfa/setup").cookie(access)).andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/mfa/enable").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest());

        // 有効化されていないので password ログインは1段階のまま。
        assertThat(passwordLogin(EMAIL).getResponse().getCookie("access_token")).isNotNull();
    }

    /** disable 後は1段階ログインに戻る。 */
    @Test
    void disable_returns_to_single_step() throws Exception {
        Cookie access = login(EMAIL);
        String secret = setupAndEnable(access);

        mockMvc.perform(post("/api/auth/mfa/disable").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isNoContent());

        MvcResult res = passwordLogin(EMAIL);
        assertThat(res.getResponse().getStatus()).isEqualTo(200);
        assertThat(res.getResponse().getCookie("access_token")).isNotNull();
    }

    /** setup は認証必須（未認証は 401）。 */
    @Test
    void setup_requires_auth() throws Exception {
        mockMvc.perform(post("/api/auth/mfa/setup")).andExpect(status().isUnauthorized());
    }

    /** /me に mfaEnabled が含まれる。 */
    @Test
    void me_exposes_mfa_status() throws Exception {
        Cookie access = login(EMAIL);
        mockMvc.perform(get("/api/auth/me").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaEnabled").value(false));
    }
}
