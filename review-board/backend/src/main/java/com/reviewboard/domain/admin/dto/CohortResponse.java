package com.reviewboard.domain.admin.dto;

import com.reviewboard.domain.cohort.Cohort;

import java.time.OffsetDateTime;

/** cohort 応答。 */
public record CohortResponse(Long id, String name, OffsetDateTime createdAt) {

    public static CohortResponse from(Cohort cohort) {
        return new CohortResponse(cohort.getId(), cohort.getName(), cohort.getCreatedAt());
    }
}
