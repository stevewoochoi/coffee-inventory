package com.coffee.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "packaging")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Packaging {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "pack_name", nullable = false, length = 100)
    private String packName;

    @Column(name = "units_per_pack", nullable = false, precision = 10, scale = 3)
    private BigDecimal unitsPerPack;

    @Column(name = "pack_barcode", length = 100)
    private String packBarcode;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PackagingStatus status = PackagingStatus.ACTIVE;

    @Column(name = "order_unit_name", length = 20)
    @Builder.Default
    private String orderUnitName = "BOX";

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
