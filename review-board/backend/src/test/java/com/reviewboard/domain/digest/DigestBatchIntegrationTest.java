package com.reviewboard.domain.digest;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.domain.user.UserStatus;
import com.reviewboard.mail.MailService;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

/**
 * C-5 週次ダイジェスト（#233）。集計の正しさ・opt-out 尊重・cohort 境界を検証する。
 * メールは {@link MockitoSpyBean} で覗き、{@code enabled()} を true にスタブして送信判定を試す。
 */
class DigestBatchIntegrationTest extends AbstractIntegrationTest {

    @MockitoSpyBean
    MailService mailService;

    @Autowired
    DigestService digestService;

    @Autowired
    com.reviewboard.domain.notificationpref.NotificationPrefService prefService;

    private Cohort cohortA;
    private Cohort cohortB;
    private User aliceA; // cohort A・既定（opt-in）
    private User bobA;   // cohort A・opt-out 予定

    @BeforeEach
    void seed() {
        doReturn(true).when(mailService).enabled(); // バッチを走らせるため有効化
        cohortA = newCohort("A");
        cohortB = newCohort("B");
        aliceA = newUser("alice@a.example", UserRole.STUDENT, cohortA.getId());
        bobA = newUser("bob@a.example", UserRole.STUDENT, cohortA.getId());
    }

    private void newUnreviewedPost(Long authorId, Long cohortId) {
        OffsetDateTime now = OffsetDateTime.now();
        Post p = new Post();
        p.setAuthorUserId(authorId);
        p.setCohortId(cohortId);
        p.setTitle("作品");
        p.setDescription("説明");
        p.setRecruitStatus(RecruitStatus.OPEN);
        p.setReviewCount(0); // 未レビュー
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        postRepository.save(p);
    }

    /** opt-in ユーザーには、cohort 内の未レビュー件数を載せて送る。opt-out には送らない。 */
    @Test
    void sends_to_opted_in_only_with_correct_count() throws Exception {
        newUnreviewedPost(aliceA.getId(), cohortA.getId());
        newUnreviewedPost(aliceA.getId(), cohortA.getId()); // cohort A の未レビュー=2

        // bob は週次ダイジェストを opt-out。
        prefService.update(bobA.getId(), true, false);

        int sent = digestService.sendWeeklyDigests();

        // alice にだけ届く（bob は opt-out）。
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailService, timeout(3000)).send(eq("alice@a.example"), any(), body.capture());
        verify(mailService, never()).send(eq("bob@a.example"), any(), any());
        assertThat(body.getValue()).contains("2 件");
        assertThat(sent).isEqualTo(1);
    }

    /** email 全体を opt-out したユーザーには（週次 ON でも）送らない。 */
    @Test
    void email_opt_out_suppresses_digest() throws Exception {
        newUnreviewedPost(aliceA.getId(), cohortA.getId());
        prefService.update(aliceA.getId(), false, true); // メール全体オフ
        prefService.update(bobA.getId(), false, true);

        int sent = digestService.sendWeeklyDigests();

        verify(mailService, never()).send(any(), any(), any());
        assertThat(sent).isZero();
    }

    /** 送る中身（未レビュー・未読）が無いユーザーには送らない（空メール抑止）。 */
    @Test
    void no_content_no_mail() {
        // 未レビュー投稿なし・未読通知なし。
        int sent = digestService.sendWeeklyDigests();
        verify(mailService, never()).send(any(), any(), any());
        assertThat(sent).isZero();
    }

    /** cohort 境界：B の未レビューは A のメンバーの集計に混ざらない。 */
    @Test
    void cohort_boundary_is_respected() throws Exception {
        User carolB = newUser("carol@b.example", UserRole.STUDENT, cohortB.getId());
        newUnreviewedPost(carolB.getId(), cohortB.getId()); // cohort B のみ未レビュー=1
        // cohort A は未レビュー 0 → A のメンバーには送られない。

        digestService.sendWeeklyDigests();

        verify(mailService, never()).send(eq("alice@a.example"), any(), any());
        verify(mailService, never()).send(eq("bob@a.example"), any(), any());
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailService, timeout(3000)).send(eq("carol@b.example"), any(), body.capture());
        assertThat(body.getValue()).contains("1 件");
    }

    /** 無効化（kick）済みユーザーには送らない。 */
    @Test
    void disabled_user_excluded() {
        newUnreviewedPost(aliceA.getId(), cohortA.getId());
        aliceA.setStatus(UserStatus.DISABLED);
        userRepository.save(aliceA);
        bobA.setStatus(UserStatus.DISABLED);
        userRepository.save(bobA);

        int sent = digestService.sendWeeklyDigests();
        verify(mailService, never()).send(eq("alice@a.example"), any(), any());
        assertThat(sent).isZero();
    }

    /** メール無効（既定）なら何もしない。 */
    @Test
    void no_op_when_mail_disabled() {
        doReturn(false).when(mailService).enabled();
        newUnreviewedPost(aliceA.getId(), cohortA.getId());

        int sent = digestService.sendWeeklyDigests();
        assertThat(sent).isZero();
        verify(mailService, never()).send(any(), any(), any());
    }
}
