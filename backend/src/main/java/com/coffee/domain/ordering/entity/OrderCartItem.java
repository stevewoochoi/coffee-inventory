package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_cart_item")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderCartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cart_id", nullable = false)
    private Long cartId;

    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "packaging_id", nullable = false)
    private Long packagingId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "pack_qty", nullable = false)
    @Builder.Default
    private Integer packQty = 1;

    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "recommended_qty")
    private Integer recommendedQty;

    @Column(name = "recommended_by_ai")
    @Builder.Default
    private Boolean recommendedByAi = false;

    @Column(name = "added_by")
    private Long addedBy;

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
