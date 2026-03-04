package com.coffee.domain.ordering.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class CutoffDto {

    @Getter
    @Setter
    public static class CutoffRequest {
        private LocalDate deliveryDate;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CutoffResult {
        private int cutoffCount;
        private LocalDate deliveryDate;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ShortageCheckResult {
        private LocalDate deliveryDate;
        private List<ShortageItem> shortageItems;
        private int noShortageItems;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ShortageItem {
        private Long itemId;
        private String itemName;
        private String itemCode;
        private BigDecimal currentStock;
        private BigDecimal totalOrdered;
        private BigDecimal shortageQty;
        private String unit;
        private List<AffectedOrder> affectedOrders;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AffectedOrder {
        private Long orderPlanId;
        private Long storeId;
        private String storeName;
        private int orderedPackQty;
        private Long lineId;
    }

    @Getter
    @Setter
    public static class AdjustRequest {
        private int adjustedQty;
        private String reason;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class DispatchResult {
        private int dispatchedCount;
        private boolean hasUnresolvedShortage;
    }
}
