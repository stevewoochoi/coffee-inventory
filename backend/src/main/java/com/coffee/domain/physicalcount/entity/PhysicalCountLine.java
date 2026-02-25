package com.coffee.domain.physicalcount.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "physical_count_line")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PhysicalCountLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "count_id", nullable = false)
    private Long countId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "system_qty", nullable = false, precision = 12, scale = 3)
    private BigDecimal systemQty;

    @Column(name = "actual_qty", precision = 12, scale = 3)
    private BigDecimal actualQty;

    @Column(name = "gap_qty", precision = 12, scale = 3)
    private BigDecimal gapQty;

    @Column(columnDefinition = "TEXT")
    private String note;
}
