package com.coffee.domain.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

public class LowStockDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long itemId;
        private String itemName;
        private String baseUnit;
        private BigDecimal currentQty;
        private BigDecimal minStockQty;
        private BigDecimal deficit;
    }
}
