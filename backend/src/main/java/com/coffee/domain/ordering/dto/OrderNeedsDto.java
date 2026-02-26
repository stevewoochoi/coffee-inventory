package com.coffee.domain.ordering.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

public class OrderNeedsDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long storeId;
        private List<NeedsItem> urgent;
        private List<NeedsItem> recommended;
        private List<NeedsItem> predicted;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class NeedsItem {
        private Long itemId;
        private String itemName;
        private String category;
        private String baseUnit;
        private BigDecimal currentStock;
        private BigDecimal minStock;
        private BigDecimal avgDailyUsage;
        private BigDecimal daysUntilEmpty;
        private Integer suggestedQty;
        private List<SupplierOption> suppliers;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class SupplierOption {
        private Long supplierId;
        private String supplierName;
        private List<PackagingOption> packagings;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PackagingOption {
        private Long packagingId;
        private String packName;
        private BigDecimal unitsPerPack;
        private BigDecimal price;
        private Integer leadTimeDays;
        private Integer suggestedPackQty;
    }
}
