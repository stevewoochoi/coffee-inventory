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

    @Column(name = "brand_id")
    private Long brandId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_en", length = 200)
    private String nameEn;

    @Column(name = "name_ja", length = 200)
    private String nameJa;

    @Column(name = "name_ko", length = 200)
    private String nameKo;

    @Column(length = 50)
    private String category;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "base_unit", nullable = false, length = 20)
    private String baseUnit;

    @Column(name = "loss_rate", precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal lossRate = BigDecimal.ZERO;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "vat_inclusive")
    @Builder.Default
    private Boolean vatInclusive = true;

    @Column(name = "supplier_id")
    private Long supplierId;

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

    @Column(name = "item_code", length = 50)
    private String itemCode;

    @Column(name = "spec", length = 200)
    private String spec;

    @Column(columnDefinition = "TEXT")
    private String description;

    // ── Operational fields (V6 addition) ──
    @Column(name = "stock_unit", length = 20)
    @Builder.Default
    private String stockUnit = "ea";

    @Column(name = "order_unit", length = 20)
    @Builder.Default
    private String orderUnit = "ea";

    @Column(name = "conversion_qty", precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal conversionQty = BigDecimal.ONE;

    @Column(name = "min_order_qty")
    @Builder.Default
    private Integer minOrderQty = 1;

    @Column(name = "par_level", precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal parLevel = BigDecimal.ZERO;

    @Column(name = "count_cycle", length = 20)
    @Builder.Default
    private String countCycle = "WEEKLY";

    @Column(name = "storage_zone", length = 20)
    @Builder.Default
    private String storageZone = "AMBIENT";

    @Column(name = "item_grade", length = 5)
    @Builder.Default
    private String itemGrade = "B";

    @Column(name = "substitute_item_id")
    private Long substituteItemId;

    @Column(name = "lot_tracking", length = 20)
    @Builder.Default
    private String lotTracking = "NONE";

    @Column(name = "daily_usage_avg", precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal dailyUsageAvg = BigDecimal.ZERO;

    @Column(name = "is_pos_tracked")
    @Builder.Default
    private Boolean isPosTracked = false;

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
