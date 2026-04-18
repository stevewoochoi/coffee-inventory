package com.coffee.domain.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "inventory_snapshot", uniqueConstraints = {
        @UniqueConstraint(name = "uq_store_item_lot", columnNames = {"store_id", "item_id", "exp_date", "lot_no"})
})
@DynamicUpdate
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

    @Version
    @Column(name = "version")
    @Builder.Default
    private Long version = 0L;

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
