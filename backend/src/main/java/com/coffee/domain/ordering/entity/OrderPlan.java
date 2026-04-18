package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_plan")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(30)")
    @Builder.Default
    private OrderStatus status = OrderStatus.DRAFT;

    @Column(name = "recommended_by_ai")
    @Builder.Default
    private Boolean recommendedByAi = false;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "cutoff_at")
    private LocalDateTime cutoffAt;

    @Column(name = "auto_confirmed_at")
    private LocalDateTime autoConfirmedAt;

    @Column(name = "fulfillment_status", length = 20)
    @Builder.Default
    private String fulfillmentStatus = "PENDING";

    @Column(name = "delivery_policy_id")
    private Long deliveryPolicyId;

    @Column(name = "total_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "vat_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

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
