package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class BrandItemDto {

    @Getter
    @Setter
    public static class AssignRequest {
        @NotNull(message = "Brand ID is required")
        private Long brandId;

        @NotNull(message = "Item ID is required")
        private Long itemId;

        private BigDecimal price;
        private Boolean vatInclusive;
        private Long supplierId;
        private BigDecimal minStockQty;
        private Boolean isOrderable;
        private Integer displayOrder;
    }

    @Getter
    @Setter
    public static class UpdateRequest {
        private BigDecimal price;
        private Boolean vatInclusive;
        private Long supplierId;
        private BigDecimal minStockQty;
        private Boolean isOrderable;
        private Integer displayOrder;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long brandId;
        private String brandName;
        private Long itemId;
        private String itemName;
        private String itemCode;
        private String baseUnit;
        private String category;
        private Long categoryId;
        private String categoryName;
        private String imageUrl;
        private String temperatureZone;
        private BigDecimal price;
        private Boolean vatInclusive;
        private Long supplierId;
        private String supplierName;
        private BigDecimal minStockQty;
        private Boolean isOrderable;
        private Integer displayOrder;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }
}
