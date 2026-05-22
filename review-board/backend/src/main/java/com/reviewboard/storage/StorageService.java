package com.reviewboard.storage;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.domain.auth.AuthPrincipal;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

/**
 * 成果物スクショの安全なアップロード／表示（★SEC-8）。
 *
 * <ul>
 *   <li><b>magic byte 判定</b>：クライアントの Content-Type／拡張子を信用せず、先頭バイトで実体を判定する
 *       （偽装した実行ファイル等の混入を防ぐ）。許可は PNG / JPEG / WebP のみ。</li>
 *   <li><b>サイズ上限</b>：multipart 上限に加えサービス側でも再確認する。</li>
 *   <li><b>S3 隔離</b>：private バケットに保存し公開しない。表示は短命の署名付き GET URL のみ。</li>
 * </ul>
 */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final S3Client s3;
    private final S3Presigner presigner;
    private final StorageProperties props;

    public StorageService(S3Client s3, S3Presigner presigner, StorageProperties props) {
        this.s3 = s3;
        this.presigner = presigner;
        this.props = props;
    }

    /** 起動時にバケットが無ければ作る（MinIO は初期状態が空）。本番 S3 は IaC で作成済みでも no-op。 */
    @PostConstruct
    void ensureBucket() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(props.bucket()).build());
        } catch (NoSuchBucketException e) {
            log.info("bucket '{}' が無いため作成します", props.bucket());
            s3.createBucket(b -> b.bucket(props.bucket()));
        }
    }

    /**
     * スクショをアップロードし、保存キー（screenshot_key に入れる値）を返す。
     * cohort ごとにパスを分け、ファイル名は UUID（推測不能・元名は使わない）。
     *
     * @param bytes              受信したファイル本体
     * @param principal          検証済みユーザー（cohort 境界でパスを分ける）
     */
    public String uploadScreenshot(byte[] bytes, AuthPrincipal principal) {
        if (bytes == null || bytes.length == 0) {
            throw new InvalidRequestException("ファイルが空です");
        }
        if (bytes.length > props.maxUploadBytes()) {
            throw new InvalidRequestException(
                    "ファイルサイズが上限（" + (props.maxUploadBytes() / (1024 * 1024)) + "MB）を超えています");
        }
        ImageType type = sniff(bytes); // ★magic byte：拡張子・Content-Type は信用しない
        String key = "screenshots/" + principal.cohortId() + "/" + UUID.randomUUID() + type.extension();
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(props.bucket())
                        .key(key)
                        .contentType(type.contentType()) // 判定済みの実体に基づく
                        .build(),
                RequestBody.fromBytes(bytes));
        return key;
    }

    /** 表示用の短命な署名付き GET URL。key が無ければ null。 */
    public String presignedGetUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        var presigned = presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(props.presignTtlSeconds()))
                .getObjectRequest(GetObjectRequest.builder().bucket(props.bucket()).key(key).build())
                .build());
        return presigned.url().toString();
    }

    /** 先頭バイトから画像種別を判定する。未対応なら 400。 */
    private ImageType sniff(byte[] b) {
        if (startsWith(b, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return ImageType.PNG;
        }
        if (startsWith(b, 0xFF, 0xD8, 0xFF)) {
            return ImageType.JPEG;
        }
        // WebP：RIFF????WEBP（4-7 バイト目はサイズなので飛ばす）
        if (startsWith(b, 0x52, 0x49, 0x46, 0x46) && b.length >= 12
                && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50) {
            return ImageType.WEBP;
        }
        throw new InvalidRequestException("画像ファイル（PNG / JPEG / WebP）のみアップロードできます");
    }

    private boolean startsWith(byte[] b, int... prefix) {
        if (b.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if ((b[i] & 0xFF) != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private enum ImageType {
        PNG("image/png", ".png"),
        JPEG("image/jpeg", ".jpg"),
        WEBP("image/webp", ".webp");

        private final String contentType;
        private final String extension;

        ImageType(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        String contentType() {
            return contentType;
        }

        String extension() {
            return extension;
        }
    }
}
