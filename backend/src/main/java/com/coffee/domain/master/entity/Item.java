package com.coffee.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "item")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String category;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "base_unit", nullable = false, length = 20)
    private String baseUnit;

    @Column(name = "loss_rate", precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal lossRate = BigDecimal.ZERO;

    @Column(name = "min_stock_qty", precision = 12, scale = 3)
    private BigDecimal minStockQty;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "lead_time_days")
    @Builder.Default
    private Integer leadTimeDays = 2;

    @Column(name = "max_order_qty")
    private Integer maxOrderQty;

    @Column(name = "temperature_zone", length = 20)
    @Builder.Default
    private String temperatureZone = "AMBIENT";

    @Column(name = "is_orderable")
    @Builder.Default
    private Boolean isOrderable = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
