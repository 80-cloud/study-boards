package com.reviewboard.config;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.evaluation.Evaluation;
import com.reviewboard.domain.evaluation.EvaluationRepository;
import com.reviewboard.domain.evaluation.EvaluationResult;
import com.reviewboard.domain.notification.Notification;
import com.reviewboard.domain.notification.NotificationRepository;
import com.reviewboard.domain.notification.NotificationType;
import com.reviewboard.domain.post.AiUsage;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostLike;
import com.reviewboard.domain.post.PostLikeRepository;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.post.ReviewAspect;
import com.reviewboard.domain.post.ReviewTone;
import com.reviewboard.domain.review.GrowthStatus;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * 開発環境専用のシードデータ（dev プロファイルのみ）。
 *
 * <p>users が空のときだけ、第三者が公開URLを開いてすぐに「触って動く」状態を作るための
 * 豊富なデモデータを投入する：cohort 1 + 講師1 + 受講生4（うち1名は demo@example.com）
 * + 投稿20 + レビュー30 + 通知10 + いいね15 + 評価5。
 *
 * <p>本番（profile=prod）では本クラス自体が Bean としてロードされない＝構造的に安全。
 * パスワードは {@code SEED_PASSWORD} 環境変数から取得（未設定なら何もしない＝機密ハードコード禁止）。
 */
@Component
@Profile("dev")
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final CohortRepository cohortRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationRepository notificationRepository;
    private final PostLikeRepository postLikeRepository;
    private final EvaluationRepository evaluationRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;

    public DevDataSeeder(CohortRepository cohortRepository,
                         UserRepository userRepository,
                         PostRepository postRepository,
                         ReviewRepository reviewRepository,
                         NotificationRepository notificationRepository,
                         PostLikeRepository postLikeRepository,
                         EvaluationRepository evaluationRepository,
                         PasswordEncoder passwordEncoder,
                         @Value("${SEED_PASSWORD:}") String seedPassword) {
        this.cohortRepository = cohortRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.notificationRepository = notificationRepository;
        this.postLikeRepository = postLikeRepository;
        this.evaluationRepository = evaluationRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }
        if (seedPassword == null || seedPassword.isBlank()) {
            log.warn("[dev seed] SEED_PASSWORD 未設定のためシードをスキップしました");
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();

        // --- cohort + users ---
        Cohort cohort = new Cohort();
        cohort.setName("2026 期 A");
        cohort.setCreatedAt(now);
        cohort = cohortRepository.save(cohort);
        Long cohortId = cohort.getId();

        User teacher = save(newUser("teacher@example.com", "講師ティーチャー", UserRole.TEACHER, cohortId, now,
                "受講生の成長を見守り、合格バッジで成果を認定します。"));
        // demo@example.com は LoginPage の「デモで試す」ボタンの遷移先（README に同期掲載）。
        User demo = save(newUser("demo@example.com", "デモ受講生", UserRole.STUDENT, cohortId, now,
                "触ってすぐに動く体験のためのデモアカウントです。"));
        User student1 = save(newUser("student@example.com", "受講生スチューデント", UserRole.STUDENT, cohortId, now,
                "Web フロントエンドを学習中。React 19 を触り始めました。"));
        User student2 = save(newUser("aoi@example.com", "葵 ハルカ", UserRole.STUDENT, cohortId, now,
                "デザインからキャリアチェンジ。アクセシビリティに興味があります。"));
        User student3 = save(newUser("ren@example.com", "蓮 タクミ", UserRole.STUDENT, cohortId, now,
                "業務系の SIer 出身。クリーンアーキを学習中。"));
        List<User> students = List.of(demo, student1, student2, student3);

        // --- posts（各 student 5件 × 4 = 20件） ---
        List<Post> posts = new ArrayList<>();
        Object[][] postSpec = new Object[][] {
                // demo の投稿（最新が画面上位に来るよう新しい順で投入）
                {0, "TODO アプリ（React）", "Hooks 学習を兼ねた最初の制作物です。コンポーネント分割の改善案がほしいです。", "https://react.dev", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.WELCOME_BEGINNER), EnumSet.of(ReviewAspect.UI, ReviewAspect.CODE), RecruitStatus.OPEN},
                {0, "ポートフォリオサイト初版", "Astro で作った自己紹介サイトです。表示崩れがないか見てください。", "https://astro.build", AiUsage.NONE,
                        EnumSet.of(ReviewTone.GENTLE), EnumSet.of(ReviewAspect.UI, ReviewAspect.ACCESSIBILITY), RecruitStatus.OPEN},
                {0, "家計簿アプリ", "支出のカテゴリ別グラフを追加しました。データ構造の改善案を歓迎します。", "https://mui.com", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.DETAILED), EnumSet.of(ReviewAspect.DB, ReviewAspect.CODE), RecruitStatus.OPEN},
                {0, "RSS リーダー", "Next.js + SQLite。お気に入り機能を実装しました。", "https://nextjs.org", AiUsage.NONE,
                        EnumSet.of(ReviewTone.QUICK_OK), EnumSet.of(ReviewAspect.PERFORMANCE), RecruitStatus.OPEN},
                {0, "天気予報ウィジェット", "外部 API を叩いて表示するだけのシンプルな練習です。", "https://vitejs.dev", AiUsage.NONE,
                        EnumSet.of(ReviewTone.WELCOME_BEGINNER), EnumSet.of(ReviewAspect.UX), RecruitStatus.CLOSED},
                // student1 の投稿
                {1, "TypeScript で型を厳格化した API クライアント", "any を全て排除しました。設計の改善余地があれば。", "https://www.typescriptlang.org", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.DETAILED, ReviewTone.HARSH_OK), EnumSet.of(ReviewAspect.ARCHITECTURE, ReviewAspect.TESTING), RecruitStatus.OPEN},
                {1, "ブログサイト Astro 製", "MD ファイルから自動生成。SEO を意識した構造にしました。", "https://astro.build", AiUsage.NONE,
                        EnumSet.of(ReviewTone.GENTLE), EnumSet.of(ReviewAspect.UI), RecruitStatus.OPEN},
                {1, "Chrome 拡張：ページ要約", "Manifest V3 で実装。セキュリティ的に問題ないか見てください。", "https://developer.chrome.com", AiUsage.USED,
                        EnumSet.of(ReviewTone.HARSH_OK), EnumSet.of(ReviewAspect.SECURITY), RecruitStatus.OPEN},
                {1, "電卓アプリ Vue 版", "Vue 3 Composition API の練習。React と比べてみてください。", "https://vuejs.org", AiUsage.NONE,
                        EnumSet.of(ReviewTone.QUICK_OK), EnumSet.of(ReviewAspect.CODE), RecruitStatus.CLOSED},
                {1, "Markdown プレビュー", "リアルタイムプレビュー。XSS 対策を入れました。", "https://developer.mozilla.org", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.DETAILED), EnumSet.of(ReviewAspect.SECURITY), RecruitStatus.OPEN},
                // student2 の投稿
                {2, "デザインシステム Storybook", "色・余白・タイポグラフィをトークン化しました。", "https://storybook.js.org", AiUsage.NONE,
                        EnumSet.of(ReviewTone.WELCOME_BEGINNER), EnumSet.of(ReviewAspect.UI, ReviewAspect.ACCESSIBILITY), RecruitStatus.OPEN},
                {2, "Figma → Tailwind 変換ツール", "Figma 変数を CSS 変数に変換します。", "https://tailwindcss.com", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.DETAILED), EnumSet.of(ReviewAspect.CODE), RecruitStatus.OPEN},
                {2, "アクセシビリティチェッカー", "axe を組み込んだ独自レポート画面です。", "https://www.figma.com", AiUsage.USED,
                        EnumSet.of(ReviewTone.HARSH_OK), EnumSet.of(ReviewAspect.ACCESSIBILITY), RecruitStatus.OPEN},
                {2, "アイコンライブラリ自作", "SVG を React コンポーネント化しました。", "https://eslint.org", AiUsage.NONE,
                        EnumSet.of(ReviewTone.GENTLE), EnumSet.of(ReviewAspect.UI), RecruitStatus.CLOSED},
                {2, "ダークモード対応 デモ", "system / light / dark の切替実装です。", "https://prettier.io", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.QUICK_OK), EnumSet.of(ReviewAspect.UX), RecruitStatus.OPEN},
                // student3 の投稿
                {3, "DDD 風 タスク管理 API", "Spring Boot + ヘキサゴナル。境界の妥当性を見てください。", "https://spring.io", AiUsage.NONE,
                        EnumSet.of(ReviewTone.DETAILED, ReviewTone.HARSH_OK), EnumSet.of(ReviewAspect.ARCHITECTURE, ReviewAspect.TESTING), RecruitStatus.OPEN},
                {3, "Kafka メッセージング 実験", "Producer / Consumer の最小例。冪等性まで考慮。", "https://kafka.apache.org", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.HARSH_OK), EnumSet.of(ReviewAspect.ARCHITECTURE), RecruitStatus.OPEN},
                {3, "Postgres + JOOQ のサンプル", "型安全な SQL ビルダーの導入例。", "https://www.postgresql.org", AiUsage.NONE,
                        EnumSet.of(ReviewTone.DETAILED), EnumSet.of(ReviewAspect.DB, ReviewAspect.PERFORMANCE), RecruitStatus.OPEN},
                {3, "Docker Compose 開発スタック", "DB + キャッシュ + アプリの一括起動。", "https://www.docker.com", AiUsage.NONE,
                        EnumSet.of(ReviewTone.QUICK_OK), EnumSet.of(ReviewAspect.PERFORMANCE), RecruitStatus.CLOSED},
                {3, "K8s 入門メモアプリ", "Helm chart 込みでデプロイ可能にしました。", "https://kubernetes.io", AiUsage.PARTIAL,
                        EnumSet.of(ReviewTone.DETAILED), EnumSet.of(ReviewAspect.ARCHITECTURE), RecruitStatus.OPEN},
        };
        for (int i = 0; i < postSpec.length; i++) {
            Object[] row = postSpec[i];
            User author = students.get((int) row[0]);
            Post p = new Post();
            p.setAuthorUserId(author.getId());
            p.setCohortId(cohortId);
            p.setTitle((String) row[1]);
            p.setDescription((String) row[2]);
            p.setDemoUrl((String) row[3]);
            p.setAiUsage((AiUsage) row[4]);
            @SuppressWarnings("unchecked")
            Set<ReviewTone> tones = (Set<ReviewTone>) row[5];
            p.setReviewTones(tones);
            @SuppressWarnings("unchecked")
            Set<ReviewAspect> aspects = (Set<ReviewAspect>) row[6];
            p.setReviewAspects(aspects);
            p.setRecruitStatus((RecruitStatus) row[7]);
            // 投入順が「新→旧」となるよう、後ろの spec ほど created_at を古く。
            OffsetDateTime t = now.minusHours(postSpec.length - i);
            p.setCreatedAt(t);
            p.setUpdatedAt(t);
            posts.add(postRepository.save(p));
        }

        // --- reviews（30件・投稿者以外がランダムに） ---
        String[] goods = new String[] {
                "観点が明確で、何を改善したいかが伝わりやすかったです。",
                "コンポーネント分割が綺麗で読みやすかったです。",
                "README が丁寧で、最初の一歩が迷わずに切れました。",
                "テストの観点が網羅されていて学びになりました。",
                "命名が一貫していて意図が読み取りやすかったです。",
                "ファイル構成がシンプルで再現しやすかったです。",
        };
        String[] improvements = new String[] {
                "エラー処理を共通化するとさらに保守しやすくなります。",
                "型を分離して再利用できるようにすると良さそうです。",
                "ローディング状態の UI を入れると体験が向上しそうです。",
                "アクセシビリティの観点で label を追加できそうです。",
                "テストが薄い境界条件をいくつか足すと安心です。",
                "コミット粒度を細かくすると履歴が追いやすくなります。",
        };
        List<Review> reviews = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            Post target = posts.get(i % posts.size());
            // 投稿者以外をレビュアーに（6 件に 1 件は講師）。
            User reviewer;
            if (i % 6 == 0) {
                reviewer = teacher;
            } else {
                reviewer = students.get(i % students.size());
                if (reviewer.getId().equals(target.getAuthorUserId())) {
                    reviewer = students.get((i + 1) % students.size());
                }
                if (reviewer.getId().equals(target.getAuthorUserId())) {
                    reviewer = students.get((i + 2) % students.size());
                }
            }
            Review r = new Review();
            r.setPostId(target.getId());
            r.setReviewerUserId(reviewer.getId());
            r.setGood(goods[i % goods.length]);
            r.setImprovement(improvements[i % improvements.length]);
            r.setGrowthStatus(switch (i % 5) {
                case 0 -> GrowthStatus.OPEN;
                case 1 -> GrowthStatus.FIXED;
                case 2 -> GrowthStatus.RESOLVED;
                case 3 -> GrowthStatus.RE_REVIEW_REQUESTED;
                default -> GrowthStatus.WONT_FIX;
            });
            r.setThanksCount(i % 3);
            OffsetDateTime t = now.minusMinutes(30L * (30 - i));
            r.setCreatedAt(t);
            r.setUpdatedAt(t);
            reviews.add(reviewRepository.save(r));
            // post.review_count を非正規化更新
            target.setReviewCount(target.getReviewCount() + 1);
        }
        for (Post p : posts) {
            postRepository.save(p);
        }

        // --- notifications（10件・既読5/未読5） ---
        for (int i = 0; i < 10; i++) {
            Review src = reviews.get(i % reviews.size());
            Post target = posts.stream()
                    .filter(p -> p.getId().equals(src.getPostId()))
                    .findFirst()
                    .orElseThrow();
            Notification n = new Notification();
            n.setRecipientUserId(target.getAuthorUserId());
            n.setActorUserId(src.getReviewerUserId());
            n.setType(NotificationType.REVIEW_RECEIVED);
            n.setPostId(target.getId());
            n.setReviewId(src.getId());
            n.setCreatedAt(now.minusMinutes(15L * i));
            if (i >= 5) {
                n.setReadAt(now.minusMinutes(10L * (i - 5)));
            }
            notificationRepository.save(n);
        }

        // --- post_likes（15件・投稿者本人を除く各 student が他者投稿に） ---
        int likeCount = 0;
        for (int i = 0; i < posts.size() && likeCount < 15; i++) {
            Post p = posts.get(i);
            for (User u : students) {
                if (u.getId().equals(p.getAuthorUserId())) continue;
                if (likeCount >= 15) break;
                PostLike like = new PostLike();
                like.setPostId(p.getId());
                like.setUserId(u.getId());
                like.setCreatedAt(now.minusMinutes(7L * likeCount));
                postLikeRepository.save(like);
                p.setLikeCount(p.getLikeCount() + 1);
                likeCount++;
            }
            postRepository.save(p);
        }

        // --- evaluations（5件・講師による APPROVED 中心） ---
        for (int i = 0; i < 5; i++) {
            Post target = posts.get(i);
            Evaluation e = new Evaluation();
            e.setPostId(target.getId());
            e.setTeacherUserId(teacher.getId());
            e.setResult(i == 4 ? EvaluationResult.RETURNED : EvaluationResult.APPROVED);
            e.setComment(i == 4
                    ? "意図は伝わりました。観点別コメントをもう一段深掘りすると合格に届きます。"
                    : "観点が明確で、改善も具体的でした。合格です。");
            e.setLatest(true);
            e.setCreatedAt(now.minusHours(2L * i + 1));
            evaluationRepository.save(e);
        }

        log.info("[dev seed] cohort + {} users + {} posts + {} reviews + 10 notifications + 15 likes + 5 evaluations を作成しました",
                1 + students.size(), posts.size(), reviews.size());
    }

    private User save(User u) {
        return userRepository.save(u);
    }

    private User newUser(String email, String displayName, UserRole role, Long cohortId,
                         OffsetDateTime now, String bio) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(seedPassword));
        user.setDisplayName(displayName);
        user.setRole(role);
        user.setCohortId(cohortId);
        user.setBio(bio);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return user;
    }
}
