package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ItemDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Brand ID is required")
        private Long brandId;

        @NotBlank(message = "Item name is required")
        @Size(max = 100)
        private String name;

        @Size(max = 50)
        private String category;

        private Long categoryId;

        @NotBlank(message = "Base unit is required")
        @Size(max = 20)
        private String baseUnit;

        private BigDecimal lossRate;
        private BigDecimal price;
        private Boolean vatInclusive;
        private Long supplierId;
        private BigDecimal minStockQty;
    }

    @Getter
    @Setter
    public static class MinStockRequest {
        @NotNull(message = "Min stock quantity is required")
        private BigDecimal minStockQty;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long brandId;
        private String name;
        private String category;
        private Long categoryId;
        private String categoryName;
        private String baseUnit;
        private BigDecimal lossRate;
        private BigDecimal price;
        private Boolean vatInclusive;
        private Long supplierId;
        private String supplierName;
        private BigDecimal minStockQty;
        private String imageUrl;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }
}
