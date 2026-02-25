package com.coffee.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "supplier_item")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SupplierItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "packaging_id", nullable = false)
    private Long packagingId;

    @Column(name = "supplier_sku", length = 100)
    private String supplierSku;

    @Column(name = "lead_time_days")
    @Builder.Default
    private Integer leadTimeDays = 1;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;
}
