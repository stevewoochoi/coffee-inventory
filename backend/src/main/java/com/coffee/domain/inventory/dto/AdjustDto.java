package com.coffee.domain.inventory.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

public class AdjustDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull private Long storeId;
        @NotNull private Long itemId;
        @NotNull private BigDecimal newQtyBaseUnit;
        private String memo;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long storeId;
        private Long itemId;
        private BigDecimal previousQty;
        private BigDecimal newQty;
        private BigDecimal delta;
    }
}
