package com.reviewboard.domain.cohort;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * cohort（期・コース・クラス）。全認可境界の根（ER図 §1）。
 */
@Entity
@Table(name = "cohorts")
@Getter
@Setter
@NoArgsConstructor
public class Cohort {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
