package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "packaging_id", nullable = false)
    private Long packagingId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "pack_qty", nullable = false)
    @Builder.Default
    private Integer packQty = 1;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
