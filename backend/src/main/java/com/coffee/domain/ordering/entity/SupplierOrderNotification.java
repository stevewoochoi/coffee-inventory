package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "supplier_order_notification")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SupplierOrderNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_plan_id", nullable = false)
    private Long orderPlanId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "notification_type", nullable = false, length = 30)
    private String notificationType;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "notified_by")
    private Long notifiedBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
