package com.coffee.domain.finance.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class FinanceDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PurchaseSummary {
        private int year;
        private int month;
        private BigDecimal totalPurchaseAmount;
        private List<SupplierPurchase> bySupplier;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class SupplierPurchase {
        private Long supplierId;
        private String supplierName;
        private BigDecimal amount;
        private int itemCount;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class InventoryValuation {
        private BigDecimal totalValue;
        private List<StoreValuation> byStore;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class StoreValuation {
        private Long storeId;
        private String storeName;
        private BigDecimal valuationAmount;
        private int itemCount;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class MonthlyReport {
        private int year;
        private int month;
        private BigDecimal openingInventory;
        private BigDecimal purchases;
        private BigDecimal sales;
        private BigDecimal waste;
        private BigDecimal closingInventory;
    }

    @Getter
    @Setter
    public static class ClosingRequest {
        private Long brandId;
        private int year;
        private int month;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ClosingResponse {
        private Long id;
        private Long brandId;
        private int year;
        private int month;
        private String status;
        private BigDecimal totalPurchaseAmount;
        private BigDecimal totalSalesAmount;
        private BigDecimal totalInventoryValue;
        private LocalDateTime closedAt;
    }
}
