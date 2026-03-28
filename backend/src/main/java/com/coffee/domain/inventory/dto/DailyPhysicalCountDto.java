package com.coffee.domain.inventory.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class DailyPhysicalCountDto {

    @Getter
    @Setter
    @Builder
    public static class MonthlyResponse {
        private int year;
        private int month;
        private List<ItemCountRow> rows;
    }

    @Getter
    @Setter
    @Builder
    public static class ItemCountRow {
        private Long itemId;
        private String itemName;
        private String itemNameJa;
        private String baseUnit;
        private String stockUnit;
        private BigDecimal currentSystemQty;  // Current inventory snapshot qty
        private Map<Integer, BigDecimal> dailyCounts;
        private Map<Integer, BigDecimal> systemQties;    // system qty at count time per day
        private Map<Integer, BigDecimal> varianceQties;  // variance per day
        private Map<Integer, Boolean> appliedFlags;      // whether applied per day
    }

    @Getter
    @Setter
    public static class SaveRequest {
        @NotNull
        private Long itemId;
        @NotNull
        private LocalDate countDate;
        @NotNull
        private BigDecimal qty;
        private String memo;
    }

    @Getter
    @Setter
    @Builder
    public static class SaveResponse {
        private Long id;
        private Long itemId;
        private LocalDate countDate;
        private BigDecimal qty;
        private BigDecimal systemQty;
        private BigDecimal varianceQty;
        private Boolean isApplied;
        private LocalDateTime updatedAt;
    }
}
