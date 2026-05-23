package com.reviewboard.domain.profile;

import com.reviewboard.domain.profile.dto.ProfileResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * F-STREAK-01 連続日数集計の単体テスト（DB 非依存）。
 * 活動日は JST のカレンダー日で重複排除する前提を固定する。
 */
class StreakCalculatorTest {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");
    private static final LocalDate TODAY = LocalDate.of(2026, 5, 23);

    /** JST の特定日の正午の OffsetDateTime（日付の取り違いを避ける）。 */
    private static OffsetDateTime at(LocalDate d) {
        return d.atTime(12, 0).atZone(JST).toOffsetDateTime();
    }

    @Test
    void empty_activities_yields_zero() {
        var s = StreakCalculator.compute(List.of(), TODAY, JST);
        assertThat(s.currentStreak()).isZero();
        assertThat(s.longestStreak()).isZero();
        assertThat(s.totalActiveDays()).isZero();
        assertThat(s.lastActiveDate()).isNull();
        assertThat(s.achievedBadges()).isEmpty();
    }

    @Test
    void same_day_multiple_activities_count_as_one_day() {
        var s = StreakCalculator.compute(
                List.of(at(TODAY), at(TODAY), at(TODAY)), TODAY, JST);
        assertThat(s.totalActiveDays()).isEqualTo(1);
        assertThat(s.currentStreak()).isEqualTo(1);
        assertThat(s.longestStreak()).isEqualTo(1);
    }

    @Test
    void consecutive_days_ending_today_form_current_streak() {
        var s = StreakCalculator.compute(
                List.of(at(TODAY), at(TODAY.minusDays(1)), at(TODAY.minusDays(2))), TODAY, JST);
        assertThat(s.currentStreak()).isEqualTo(3);
        assertThat(s.longestStreak()).isEqualTo(3);
        assertThat(s.achievedBadges()).containsExactly(3);
    }

    @Test
    void streak_ending_yesterday_still_counts_as_current() {
        var s = StreakCalculator.compute(
                List.of(at(TODAY.minusDays(1)), at(TODAY.minusDays(2))), TODAY, JST);
        assertThat(s.currentStreak()).isEqualTo(2);
    }

    @Test
    void gap_of_two_days_breaks_current_streak() {
        var s = StreakCalculator.compute(
                List.of(at(TODAY.minusDays(2)), at(TODAY.minusDays(3))), TODAY, JST);
        assertThat(s.currentStreak()).isZero();
        assertThat(s.longestStreak()).isEqualTo(2);
    }

    @Test
    void longest_run_picks_max_among_separate_runs() {
        // 5日連続 → 空き → 直近2日連続
        var s = StreakCalculator.compute(List.of(
                at(LocalDate.of(2026, 5, 1)), at(LocalDate.of(2026, 5, 2)), at(LocalDate.of(2026, 5, 3)),
                at(LocalDate.of(2026, 5, 4)), at(LocalDate.of(2026, 5, 5)),
                at(TODAY), at(TODAY.minusDays(1))), TODAY, JST);
        assertThat(s.longestStreak()).isEqualTo(5);
        assertThat(s.currentStreak()).isEqualTo(2);
        assertThat(s.totalActiveDays()).isEqualTo(7);
    }

    @Test
    void badges_accumulate_by_longest_streak() {
        // 8日連続 → 3,7 を達成、14/30 は未達
        var days = new java.util.ArrayList<OffsetDateTime>();
        for (int i = 0; i < 8; i++) {
            days.add(at(TODAY.minusDays(i)));
        }
        var s = StreakCalculator.compute(days, TODAY, JST);
        assertThat(s.longestStreak()).isEqualTo(8);
        assertThat(s.achievedBadges()).containsExactly(3, 7);
    }

    /** UTC 深夜でも JST 換算で正しい暦日になる（境界の取り違い防止）。 */
    @Test
    void utc_late_night_maps_to_next_jst_day() {
        // 2026-05-22T20:00Z = 2026-05-23T05:00 JST → TODAY 扱い
        OffsetDateTime utcLateNight = OffsetDateTime.of(2026, 5, 22, 20, 0, 0, 0, ZoneOffset.UTC);
        var s = StreakCalculator.compute(List.of(utcLateNight), TODAY, JST);
        assertThat(s.lastActiveDate()).isEqualTo(TODAY);
        assertThat(s.currentStreak()).isEqualTo(1);
    }
}
