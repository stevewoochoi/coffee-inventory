package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "delivery_policy")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DeliveryPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(name = "policy_name", nullable = false, length = 100)
    private String policyName;

    @Column(name = "delivery_days", nullable = false, length = 20)
    @Builder.Default
    private String deliveryDays = "MON_WED_FRI";

    @Column(name = "cutoff_time", nullable = false)
    @Builder.Default
    private LocalTime cutoffTime = LocalTime.of(9, 0);

    @Column(name = "cutoff_lead_days_before", nullable = false)
    @Builder.Default
    private Integer cutoffLeadDaysBefore = 2;

    @Column(name = "cutoff_lead_days_after", nullable = false)
    @Builder.Default
    private Integer cutoffLeadDaysAfter = 3;

    @Column(name = "fulfillment_center", length = 100)
    private String fulfillmentCenter;

    @Column(name = "temperature_zone", length = 20)
    @Builder.Default
    private String temperatureZone = "AMBIENT";

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
