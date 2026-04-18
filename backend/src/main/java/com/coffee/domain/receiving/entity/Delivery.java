package com.coffee.domain.receiving.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "expected_at")
    private LocalDate expectedAt;

    @Column(name = "order_plan_id")
    private Long orderPlanId;

    @Column(name = "ref_type", length = 20)
    private String refType;

    @Column(name = "ref_id")
    private Long refId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PENDING;

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
