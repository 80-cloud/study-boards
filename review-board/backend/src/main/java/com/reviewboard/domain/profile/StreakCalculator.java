package com.reviewboard.domain.profile;

import com.reviewboard.domain.profile.dto.ProfileResponse;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.TreeSet;

/**
 * F-STREAK-01 継続の可視化：活動タイムスタンプ（投稿・レビュー実施）から連続日数を集計する純粋関数。
 *
 * <p>副作用も DB 依存も持たないため単体テストで完結する。「活動日」は表示ゾーン（JST）の
 * カレンダー日で重複排除する。非競争（他者比較なし）の自己積み上げ指標（§1-6 継続は力なり）。
 */
public final class StreakCalculator {

    /** 達成バッジのしきい値（連続日数）。最長連続が到達したものを達成とみなす。 */
    static final List<Integer> BADGE_THRESHOLDS = List.of(3, 7, 14, 30);

    private StreakCalculator() {
    }

    /**
     * 活動タイムスタンプ群から継続指標を組み立てる。
     *
     * @param activities 投稿・実施レビューの作成日時（順不同・重複可・null 要素は無視）
     * @param today      「現在の連続」の起点となる当日（呼び出し側で zone を揃えて渡す）
     * @param zone       カレンダー日に落とすタイムゾーン（JST 想定）
     */
    public static ProfileResponse.Streak compute(Collection<OffsetDateTime> activities,
                                                 LocalDate today, ZoneId zone) {
        // 活動日を昇順・重複排除で集合化
        TreeSet<LocalDate> days = new TreeSet<>();
        for (OffsetDateTime ts : activities) {
            if (ts != null) {
                days.add(ts.atZoneSameInstant(zone).toLocalDate());
            }
        }
        if (days.isEmpty()) {
            return new ProfileResponse.Streak(0, 0, 0, null, List.of());
        }

        int longest = longestRun(days);
        int current = currentRun(days, today);
        LocalDate lastActive = days.last();
        List<Integer> badges = BADGE_THRESHOLDS.stream().filter(t -> longest >= t).toList();

        return new ProfileResponse.Streak(current, longest, days.size(), lastActive, badges);
    }

    /** 連続する暦日の最長ラン長。 */
    private static int longestRun(TreeSet<LocalDate> days) {
        int longest = 0;
        int run = 0;
        LocalDate prev = null;
        for (LocalDate d : days) {
            run = (prev != null && prev.plusDays(1).equals(d)) ? run + 1 : 1;
            longest = Math.max(longest, run);
            prev = d;
        }
        return longest;
    }

    /**
     * 当日（または前日）を起点に遡る連続日数。最終活動日が今日でも昨日でもなければ 0
     * （丸一日空くまでは途切れさせない＝「昨日まで猶予」）。
     */
    private static int currentRun(TreeSet<LocalDate> days, LocalDate today) {
        LocalDate last = days.last();
        if (last.isBefore(today.minusDays(1))) {
            return 0;
        }
        int run = 0;
        LocalDate cursor = last;
        while (days.contains(cursor)) {
            run++;
            cursor = cursor.minusDays(1);
        }
        return run;
    }
}
