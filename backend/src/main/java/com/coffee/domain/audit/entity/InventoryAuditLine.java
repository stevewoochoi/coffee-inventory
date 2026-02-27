package com.coffee.domain.audit.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventory_audit_line")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class InventoryAuditLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "system_qty", nullable = false, precision = 10, scale = 3)
    private BigDecimal systemQty;

    @Column(name = "actual_qty", precision = 10, scale = 3)
    private BigDecimal actualQty;

    @Column(name = "difference", precision = 10, scale = 3)
    private BigDecimal difference;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
