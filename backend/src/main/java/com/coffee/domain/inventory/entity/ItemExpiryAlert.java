package com.coffee.domain.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "item_expiry_alert")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ItemExpiryAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "lot_no", length = 100)
    private String lotNo;

    @Column(name = "exp_date", nullable = false)
    private LocalDate expDate;

    @Column(name = "qty_base_unit", nullable = false, precision = 12, scale = 3)
    private BigDecimal qtyBaseUnit;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_status")
    @Builder.Default
    private AlertStatus alertStatus = AlertStatus.NORMAL;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
