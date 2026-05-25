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

        // #241 有効化はリカバリコード 10 個を1度だけ返す（200）。
        mockMvc.perform(post("/api/auth/mfa/enable").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recoveryCodes", org.hamcrest.Matchers.hasSize(10)));
        return secret;
    }

    /** setup→enable し、発行されたリカバリコード（生）を返す。 */
    @SuppressWarnings("unchecked")
    private java.util.List<String> setupAndEnableCapturingCodes(Cookie access) throws Exception {
        mockMvc.perform(post("/api/auth/mfa/setup").cookie(access)).andExpect(status().isOk());
        String secret = userRepository.findByEmail(EMAIL).orElseThrow().getTotpSecret();
        MvcResult res = mockMvc.perform(post("/api/auth/mfa/enable").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.recoveryCodes");
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

    // ---- #241 リカバリコード ----

    /** リカバリコードでログイン2段目を突破できる（端末紛失時の自己復旧）。 */
    @Test
    void recovery_code_passes_second_step() throws Exception {
        Cookie access = login(EMAIL);
        java.util.List<String> codes = setupAndEnableCapturingCodes(access);

        Cookie mfa = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        MvcResult res = mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa)
                        .contentType("application/json")
                        .content("{\"code\":\"" + codes.get(0) + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(res.getResponse().getCookie("access_token")).isNotNull();
    }

    /** 使用済みリカバリコードは再利用できない（401）。 */
    @Test
    void used_recovery_code_is_rejected() throws Exception {
        Cookie access = login(EMAIL);
        java.util.List<String> codes = setupAndEnableCapturingCodes(access);
        String code = codes.get(0);

        // 1回目：成功して消費される。
        Cookie mfa1 = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa1)
                        .contentType("application/json")
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk());

        // 2回目：同じコードは 401。
        Cookie mfa2 = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa2)
                        .contentType("application/json")
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** リカバリコードを使っても TOTP は引き続き有効。 */
    @Test
    void totp_still_works_after_recovery_exists() throws Exception {
        Cookie access = login(EMAIL);
        java.util.List<String> codes = setupAndEnableCapturingCodes(access);
        String secret = userRepository.findByEmail(EMAIL).orElseThrow().getTotpSecret();

        // リカバリコードで1回ログイン。
        Cookie mfa1 = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa1)
                        .contentType("application/json")
                        .content("{\"code\":\"" + codes.get(0) + "\"}"))
                .andExpect(status().isOk());

        // TOTP も引き続き通る。
        Cookie mfa2 = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa2)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isOk());
    }

    /** 未知のリカバリコードは 401（総当たり対策の検証）。 */
    @Test
    void unknown_recovery_code_is_rejected() throws Exception {
        Cookie access = login(EMAIL);
        setupAndEnableCapturingCodes(access);
        Cookie mfa = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");

        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa)
                        .contentType("application/json")
                        .content("{\"code\":\"ZZZZ-ZZZZ\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** 残数エンドポイントが消費に応じて減る。 */
    @Test
    void recovery_status_decreases_after_use() throws Exception {
        Cookie access = login(EMAIL);
        java.util.List<String> codes = setupAndEnableCapturingCodes(access);

        mockMvc.perform(get("/api/auth/mfa/recovery-codes").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remaining").value(10))
                .andExpect(jsonPath("$.lowThreshold").value(3));

        Cookie mfa = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfa)
                        .contentType("application/json")
                        .content("{\"code\":\"" + codes.get(0) + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/mfa/recovery-codes").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remaining").value(9));
    }

    /** regenerate で新規10個を発行し、旧コードは無効化される。 */
    @Test
    void regenerate_invalidates_old_codes() throws Exception {
        Cookie access = login(EMAIL);
        java.util.List<String> oldCodes = setupAndEnableCapturingCodes(access);
        String secret = userRepository.findByEmail(EMAIL).orElseThrow().getTotpSecret();

        MvcResult res = mockMvc.perform(post("/api/auth/mfa/recovery-codes/regenerate").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recoveryCodes", org.hamcrest.Matchers.hasSize(10)))
                .andReturn();
        java.util.List<String> newCodes = JsonPath.read(res.getResponse().getContentAsString(), "$.recoveryCodes");

        // 旧コードは 401。
        Cookie mfaOld = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfaOld)
                        .contentType("application/json")
                        .content("{\"code\":\"" + oldCodes.get(0) + "\"}"))
                .andExpect(status().isUnauthorized());

        // 新コードは通る。
        Cookie mfaNew = passwordLogin(EMAIL).getResponse().getCookie("mfa_token");
        mockMvc.perform(post("/api/auth/login/mfa").cookie(mfaNew)
                        .contentType("application/json")
                        .content("{\"code\":\"" + newCodes.get(0) + "\"}"))
                .andExpect(status().isOk());
    }

    /** regenerate は誤った TOTP では 400（再生成されない）。 */
    @Test
    void regenerate_with_wrong_code_is_400() throws Exception {
        Cookie access = login(EMAIL);
        setupAndEnableCapturingCodes(access);
        mockMvc.perform(post("/api/auth/mfa/recovery-codes/regenerate").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest());
    }

    /** disable でリカバリコードも全削除される（残数0）。 */
    @Test
    void disable_clears_recovery_codes() throws Exception {
        Cookie access = login(EMAIL);
        setupAndEnableCapturingCodes(access);
        String secret = userRepository.findByEmail(EMAIL).orElseThrow().getTotpSecret();

        mockMvc.perform(post("/api/auth/mfa/disable").cookie(access)
                        .contentType("application/json")
                        .content("{\"code\":\"" + currentCode(secret) + "\"}"))
                .andExpect(status().isNoContent());

        assertThat(mfaRecoveryCodeRepository.count()).isZero();
    }

    /** recovery-codes 残数取得は認証必須（未認証は 401）。 */
    @Test
    void recovery_status_requires_auth() throws Exception {
        mockMvc.perform(get("/api/auth/mfa/recovery-codes")).andExpect(status().isUnauthorized());
    }
}
