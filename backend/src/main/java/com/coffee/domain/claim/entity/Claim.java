package com.coffee.domain.claim.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "order_plan_id")
    private Long orderPlanId;

    @Column(name = "delivery_id")
    private Long deliveryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "claim_type", nullable = false, columnDefinition = "VARCHAR(30)")
    private ClaimType claimType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(20)")
    @Builder.Default
    private ClaimStatus status = ClaimStatus.SUBMITTED;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "requested_action", length = 30)
    private String requestedAction;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @Column(name = "estimated_resolve_date")
    private LocalDate estimatedResolveDate;

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
