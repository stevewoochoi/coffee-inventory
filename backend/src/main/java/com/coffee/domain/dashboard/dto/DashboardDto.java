package com.coffee.domain.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class DashboardDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class StoreDashboard {
        private long todayReceiveCount;
        private BigDecimal todayWasteQty;
        private int lowStockCount;
        private int expiryAlertCount;
        private List<DailyConsumption> dailyConsumption;
        private BigDecimal monthOrderCost;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class BrandDashboard {
        private List<StoreSummary> storeSummaries;
        private BigDecimal totalOrderCost;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class StoreSummary {
        private Long storeId;
        private String storeName;
        private int lowStockCount;
        private int expiryAlertCount;
        private BigDecimal monthOrderCost;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class DailyConsumption {
        private LocalDate date;
        private BigDecimal totalQty;
    }
}
