package com.coffee.domain.waste.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class WasteDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Store ID is required")
        private Long storeId;

        @NotNull(message = "Item ID is required")
        private Long itemId;

        @NotNull(message = "Quantity is required")
        @Positive(message = "Quantity must be positive")
        private BigDecimal qtyBaseUnit;

        private String reason;
        private String wasteType;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long storeId;
        private Long itemId;
        private BigDecimal qtyBaseUnit;
        private String reason;
        private String wasteType;
        private Long createdBy;
        private LocalDateTime createdAt;
    }
}
