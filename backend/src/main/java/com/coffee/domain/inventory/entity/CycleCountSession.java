package com.coffee.domain.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "cycle_count_session")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CycleCountSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "grade_filter", length = 5)
    private String gradeFilter;

    @Column(name = "zone_filter", length = 20)
    private String zoneFilter;

    @Column(length = 20, nullable = false)
    @Builder.Default
    private String status = "IN_PROGRESS";

    @Column(name = "counted_by")
    private Long countedBy;

    @Column(name = "item_count")
    @Builder.Default
    private Integer itemCount = 0;

    @Column(name = "completed_count")
    @Builder.Default
    private Integer completedCount = 0;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.startedAt == null) this.startedAt = LocalDateTime.now();
    }
}
