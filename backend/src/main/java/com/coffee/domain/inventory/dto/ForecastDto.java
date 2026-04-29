package com.coffee.domain.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

public class ForecastDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long storeId;
        private List<ItemForecast> items;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ItemForecast {
        private Long itemId;
        private String itemName;
        private String category;
        private String baseUnit;
        private BigDecimal currentStock;
        private BigDecimal minStock;
        private BigDecimal avgDailyUsage;
        private BigDecimal daysUntilEmpty;
        private BigDecimal fillPercentage;
        private String trend; // UP, DOWN, STABLE
        private java.time.LocalDate nearestExpDate;
        private BigDecimal stockValue;
    }
}
