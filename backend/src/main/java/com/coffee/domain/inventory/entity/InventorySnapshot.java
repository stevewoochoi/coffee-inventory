package com.coffee.domain.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_snapshot", uniqueConstraints = {
        @UniqueConstraint(name = "uq_store_item_lot", columnNames = {"store_id", "item_id", "exp_date", "lot_no"})
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class InventorySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "exp_date")
    private LocalDate expDate;

    @Column(name = "lot_no", length = 100)
    private String lotNo;

    @Column(name = "qty_base_unit", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal qtyBaseUnit = BigDecimal.ZERO;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
