package com.reviewboard.storage;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;

import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * スクショアップロードの安全化テスト（★SEC-8）。Testcontainers MinIO で本番同等に検証する。
 *
 * <ul>
 *   <li>正規の画像（magic byte 一致）は 200・private 保存・署名 URL を返す。</li>
 *   <li>拡張子・Content-Type を偽装しても先頭バイトが画像でなければ 400（magic byte 判定）。</li>
 *   <li>サイズ上限超過は拒否（サービス側の二重防御）。未認証は 401。</li>
 * </ul>
 */
class UploadIntegrationTest extends AbstractIntegrationTest {

    @Autowired S3Client s3Client;
    @Autowired StorageProperties storageProperties;

    /** 有効な PNG マグナムバイト（先頭 8 バイト）＋適当な本体。 */
    private static final byte[] PNG_HEADER = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

    private String studentEmail;

    @BeforeEach
    void seed() {
        var cohort = newCohort("A");
        studentEmail = newUser("student@example.com", UserRole.STUDENT, cohort.getId()).getEmail();
    }

    @Test
    void valid_png_is_stored_privately_and_returns_signed_url() throws Exception {
        byte[] png = withBody(PNG_HEADER, 256);
        MockMultipartFile file = new MockMultipartFile("file", "shot.png", "image/png", png);

        MvcResult res = mockMvc.perform(multipart("/api/uploads/screenshot").file(file).cookie(login(studentEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value(org.hamcrest.Matchers.startsWith("screenshots/")))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.containsString("X-Amz-Signature")))
                .andReturn();

        // ★実体が private バケットに保存されていること（S3 で確認）。
        String key = com.jayway.jsonpath.JsonPath.read(res.getResponse().getContentAsString(), "$.key");
        assertThatCode(() -> s3Client.headObject(HeadObjectRequest.builder()
                .bucket(storageProperties.bucket()).key(key).build())).doesNotThrowAnyException();
    }

    /** ★拡張子も Content-Type も png に偽装しているが中身はテキスト → 400（magic byte が真実）。 */
    @Test
    void disguised_non_image_is_rejected_returns400() throws Exception {
        MockMultipartFile fake = new MockMultipartFile(
                "file", "evil.png", "image/png", "this is not an image".getBytes());

        mockMvc.perform(multipart("/api/uploads/screenshot").file(fake).cookie(login(studentEmail)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oversize_is_rejected() throws Exception {
        byte[] tooBig = withBody(PNG_HEADER, (int) storageProperties.maxUploadBytes() + 1);
        MockMultipartFile file = new MockMultipartFile("file", "huge.png", "image/png", tooBig);

        mockMvc.perform(multipart("/api/uploads/screenshot").file(file).cookie(login(studentEmail)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "shot.png", "image/png", withBody(PNG_HEADER, 16));

        mockMvc.perform(multipart("/api/uploads/screenshot").file(file))
                .andExpect(status().isUnauthorized());
    }

    /** header + 指定バイト数の本体（合計 header.length + bodyLen）を作る。 */
    private static byte[] withBody(byte[] header, int bodyLen) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(header);
        out.writeBytes(new byte[bodyLen]);
        return out.toByteArray();
    }
}
