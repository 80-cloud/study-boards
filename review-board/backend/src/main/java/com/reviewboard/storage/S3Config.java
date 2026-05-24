package com.reviewboard.storage;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * S3 / MinIO クライアント。ローカル（MinIO）と本番（AWS S3）を同じインタフェースで使い分ける。
 *
 * <ul>
 *   <li>endpoint 指定あり（MinIO）：endpointOverride＋path-style＋静的クレデンシャル（env 由来）。</li>
 *   <li>endpoint 空（本番 AWS S3）：override せず AWS 既定エンドポイント＋仮想ホスト形式。
 *       access/secret も空なら IAM ロール（EC2 インスタンスプロファイル）で認証する
 *       （静的キーをサーバに置かない＝SEC-9／最小権限。infra/iam.tf で S3 権限付与済み）。</li>
 * </ul>
 * 重い Netty を避け url-connection-client を使う（build.gradle）。
 */
@Configuration
public class S3Config {

    private final StorageProperties props;

    public S3Config(StorageProperties props) {
        this.props = props;
    }

    /** endpoint が指定されていれば MinIO 等のカスタムエンドポイント、空なら AWS 既定。 */
    private boolean hasCustomEndpoint() {
        return props.endpoint() != null && !props.endpoint().isBlank();
    }

    @Bean
    public S3Client s3Client() {
        var b = S3Client.builder()
                .region(Region.of(props.region()))
                .credentialsProvider(credentials())
                .serviceConfiguration(serviceConfiguration());
        if (hasCustomEndpoint()) {
            b.endpointOverride(URI.create(props.endpoint()));
        }
        return b.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        var b = S3Presigner.builder()
                .region(Region.of(props.region()))
                .credentialsProvider(credentials())
                .serviceConfiguration(serviceConfiguration());
        if (hasCustomEndpoint()) {
            b.endpointOverride(URI.create(props.endpoint()));
        }
        return b.build();
    }

    /** MinIO はパス形式が必須。AWS S3 は仮想ホスト形式（既定）を使う。 */
    private S3Configuration serviceConfiguration() {
        return S3Configuration.builder()
                .pathStyleAccessEnabled(hasCustomEndpoint())
                .build();
    }

    /**
     * access/secret が両方そろっていれば静的クレデンシャル（MinIO・ローカル）。
     * 空なら DefaultCredentialsProvider＝本番 EC2 の IAM ロールで認証する。
     */
    private AwsCredentialsProvider credentials() {
        String ak = props.accessKey();
        String sk = props.secretKey();
        if (ak != null && !ak.isBlank() && sk != null && !sk.isBlank()) {
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(ak, sk));
        }
        return DefaultCredentialsProvider.create();
    }
}
