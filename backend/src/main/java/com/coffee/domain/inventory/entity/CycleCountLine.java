package com.coffee.domain.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cycle_count_line")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CycleCountLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "system_qty", precision = 12, scale = 3)
    private BigDecimal systemQty;

    @Column(name = "counted_qty", precision = 12, scale = 3)
    private BigDecimal countedQty;

    @Column(name = "variance_qty", precision = 12, scale = 3)
    private BigDecimal varianceQty;

    @Column(name = "stock_unit", length = 20)
    private String stockUnit;

    @Column(name = "storage_zone", length = 20)
    private String storageZone;

    @Column(name = "item_grade", length = 5)
    private String itemGrade;

    @Column(name = "is_adjusted")
    @Builder.Default
    private Boolean isAdjusted = false;

    @Column(name = "adjusted_at")
    private LocalDateTime adjustedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
