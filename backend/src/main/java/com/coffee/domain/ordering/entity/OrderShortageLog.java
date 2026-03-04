package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_shortage_log")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderShortageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_plan_id", nullable = false)
    private Long orderPlanId;

    @Column(name = "order_line_id", nullable = false)
    private Long orderLineId;

    @Column(name = "original_qty", nullable = false)
    private Integer originalQty;

    @Column(name = "adjusted_qty", nullable = false)
    private Integer adjustedQty;

    @Column(name = "shortage_reason", length = 200)
    private String shortageReason;

    @Column(name = "adjusted_by", nullable = false)
    private Long adjustedBy;

    @Column(name = "adjusted_at")
    private LocalDateTime adjustedAt;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @PrePersist
    protected void onCreate() {
        if (this.adjustedAt == null) {
            this.adjustedAt = LocalDateTime.now();
        }
    }
}
