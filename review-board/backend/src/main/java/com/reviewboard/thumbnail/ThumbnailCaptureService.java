package com.reviewboard.thumbnail;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * #218 自動サムネ：投稿の demo_url をヘッドレス Chrome で開いて撮影し、S3 に保存して
 * post.auto_screenshot_key へ反映する。★best-effort（失敗は握りつぶし投稿処理に影響させない）。
 *
 * <p>フラグ {@code app.thumbnail.auto-capture-enabled} が false（本番既定）なら何もしない。
 * SSRF は {@link UrlSafetyValidator} で撮影前に遮断する（S軸）。
 */
@Service
public class ThumbnailCaptureService {

    private static final Logger log = LoggerFactory.getLogger(ThumbnailCaptureService.class);

    private final ThumbnailProperties props;
    private final UrlSafetyValidator urlSafety;
    private final StorageService storageService;
    private final PostRepository postRepository;

    public ThumbnailCaptureService(ThumbnailProperties props, UrlSafetyValidator urlSafety,
                                   StorageService storageService, PostRepository postRepository) {
        this.props = props;
        this.urlSafety = urlSafety;
        this.storageService = storageService;
        this.postRepository = postRepository;
    }

    /** 自動撮影の起動条件（フラグ ON かつ chrome パス設定あり）。呼び出し側の早期 return にも使う。 */
    public boolean enabled() {
        return props.autoCaptureEnabled() && props.chromePath() != null && !props.chromePath().isBlank();
    }

    /**
     * 投稿の保存コミット後に撮影する。{@code @TransactionalEventListener(AFTER_COMMIT)} で
     * 未コミット行を読む競合を防ぎ、{@code @Async} で投稿レスポンスをブロックしない。
     * 例外は投げず、ログのみ（サムネは付加価値＝失敗しても投稿は成立済み）。
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onThumbnailRequested(PostThumbnailRequested event) {
        Long postId = event.postId();
        Long cohortId = event.cohortId();
        String demoUrl = event.demoUrl();
        if (!enabled() || demoUrl == null || demoUrl.isBlank()) {
            return;
        }
        try {
            urlSafety.verifyPublicHttpUrl(demoUrl); // ★SSRF 遮断（撮影前）
            byte[] png = capture(demoUrl);
            String key = storageService.uploadAutoThumbnail(png, cohortId);
            // 別スレッド＝新しい永続コンテキスト。save() は単体で原子的に確定する。
            Post post = postRepository.findById(postId).orElse(null);
            if (post != null && post.getDeletedAt() == null) {
                post.setAutoScreenshotKey(key);
                postRepository.save(post);
                log.info("auto thumbnail stored: postId={} key={}", postId, key);
            }
        } catch (Exception e) {
            // SSRF 拒否・撮影失敗・到達不能などはすべてここ。投稿処理には影響させない。
            log.warn("auto thumbnail skipped: postId={} reason={}", postId, e.toString());
        }
    }

    /** ヘッドレス Chrome を一発起動して PNG を撮る。出力・プロファイルは一時ディレクトリに隔離。 */
    private byte[] capture(String url) throws IOException, InterruptedException {
        Path tmpDir = Files.createTempDirectory("rb-thumb-");
        Path out = tmpDir.resolve("shot.png");
        Path profile = tmpDir.resolve("profile");
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    props.chromePath(),
                    // 旧 headless：--screenshot のワンショットに最適で --virtual-time-budget 後に確実に終了する。
                    // （--headless=new は virtual-time-budget を無視し終了せずタイムアウトする）
                    "--headless",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--hide-scrollbars",
                    "--disable-extensions",
                    "--no-first-run",              // 初回起動フローを省きコールドスタートを短縮
                    "--no-default-browser-check",
                    "--disable-dev-shm-usage",     // /dev/shm が小さい環境（コンテナ/EC2）での安定化
                    "--user-data-dir=" + profile,
                    "--window-size=" + props.viewportWidth() + "," + props.viewportHeight(),
                    "--virtual-time-budget=4000", // ある程度の描画完了を待つ
                    "--screenshot=" + out,
                    url);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            try {
                // Chrome は --screenshot で PNG を書いた後もプロセスが終了しないことがあるため、
                // プロセス終了ではなく「出力ファイルの出現」を待つ。出たら即読んでプロセスを始末する。
                long deadline = System.currentTimeMillis() + props.timeoutMs();
                while (System.currentTimeMillis() < deadline) {
                    if (Files.exists(out) && Files.size(out) > 0) {
                        Thread.sleep(200); // 書き込み完了を待つ短い猶予
                        return Files.readAllBytes(out);
                    }
                    if (!p.isAlive() && (!Files.exists(out) || Files.size(out) == 0)) {
                        throw new IOException("撮影結果が空です（exit=" + p.exitValue() + "）: " + url);
                    }
                    Thread.sleep(150);
                }
                throw new IOException("撮影がタイムアウトしました: " + url);
            } finally {
                p.destroyForcibly(); // 終了しない Chrome を残さない（プロセスリーク防止）
                p.waitFor(2, TimeUnit.SECONDS);
            }
        } finally {
            deleteQuietly(tmpDir);
        }
    }

    private void deleteQuietly(Path dir) {
        try (var walk = Files.walk(dir)) {
            walk.sorted((a, b) -> b.getNameCount() - a.getNameCount()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // 一時ファイルの後始末失敗は致命的でない
                }
            });
        } catch (IOException ignored) {
            // walk 失敗も無視（OS の temp 掃除に委ねる）
        }
    }
}
