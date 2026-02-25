package com.coffee.domain.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ReportDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ConsumptionReport {
        private Long storeId;
        private LocalDate from;
        private LocalDate to;
        private List<ItemConsumption> items;
        private BigDecimal totalQty;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ItemConsumption {
        private Long itemId;
        private String itemName;
        private BigDecimal totalQty;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class WasteReport {
        private Long storeId;
        private LocalDate from;
        private LocalDate to;
        private List<ItemWaste> items;
        private BigDecimal totalQty;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ItemWaste {
        private Long itemId;
        private String itemName;
        private BigDecimal totalQty;
        private String topReason;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class LossRateReport {
        private Long storeId;
        private List<ItemLossRate> items;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ItemLossRate {
        private Long itemId;
        private String itemName;
        private BigDecimal receivedQty;
        private BigDecimal wastedQty;
        private BigDecimal lossRate;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class OrderCostReport {
        private Long storeId;
        private String month;
        private List<OrderCostLine> lines;
        private BigDecimal totalCost;
        private int totalOrders;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class OrderCostLine {
        private Long itemId;
        private String itemName;
        private String packName;
        private int totalPackQty;
        private BigDecimal unitPrice;
        private BigDecimal lineCost;
    }
}
