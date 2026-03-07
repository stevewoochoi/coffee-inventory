package com.coffee.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "brand_item")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BrandItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "vat_inclusive")
    @Builder.Default
    private Boolean vatInclusive = true;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "min_stock_qty", precision = 12, scale = 3)
    private BigDecimal minStockQty;

    @Column(name = "is_orderable")
    @Builder.Default
    private Boolean isOrderable = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

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
