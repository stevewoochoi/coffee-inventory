package com.coffee.domain.finance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_closing")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MonthlyClosing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(name = "closing_year", nullable = false)
    private Integer closingYear;

    @Column(name = "closing_month", nullable = false)
    private Integer closingMonth;

    @Column(length = 20)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "total_purchase_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalPurchaseAmount = BigDecimal.ZERO;

    @Column(name = "total_sales_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalSalesAmount = BigDecimal.ZERO;

    @Column(name = "total_inventory_value", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalInventoryValue = BigDecimal.ZERO;

    @Column(name = "closed_by")
    private Long closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
