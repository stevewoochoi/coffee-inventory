package com.coffee.domain.ordering.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class CatalogDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CatalogItem {
        private Long itemId;
        private String itemName;
        private Long categoryId;
        private String categoryName;
        private String imageUrl;
        private String temperatureZone;
        private BigDecimal currentStock;
        private String unit;
        private BigDecimal minStock;
        private boolean isLowStock;
        private List<PackagingOption> packagings;
        private LastOrderInfo lastOrder;
        private int suggestedQty;
        private boolean suggestedByAi;
        private Double daysUntilEmpty;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PackagingOption {
        private Long packagingId;
        private String label;
        private BigDecimal unitsPerPack;
        private BigDecimal unitPrice;
        private Long supplierId;
        private String supplierName;
        private Integer maxOrderQty;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class LastOrderInfo {
        private LocalDate date;
        private int quantity;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CategoryTree {
        private Long id;
        private String name;
        private Integer level;
        private String icon;
        private List<CategoryTree> children;
    }
}
