package com.coffee.domain.ordering.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

public class OrderSuggestionDto {

    @Getter
    @Builder
    public static class Response {
        private Long storeId;
        private Long supplierId;
        private List<SuggestionLine> lines;
    }

    @Getter
    @Builder
    public static class SuggestionLine {
        private Long packagingId;
        private Long itemId;
        private String itemName;
        private String packName;
        private BigDecimal unitsPerPack;
        private BigDecimal currentStock;
        private BigDecimal avgDailyDemand;
        private Integer leadTimeDays;
        private Integer suggestedPackQty;
        private BigDecimal parLevel;
        private BigDecimal dailyUsageAvg;
        private BigDecimal daysUntilEmpty;
        private BigDecimal leadTimeConsumption;
        private String stockUnit;
        private String orderUnit;
        private Integer minOrderQty;
        private String recommendationBasis;
    }
}
