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
        private Long brandId;

        @NotBlank(message = "Item name is required")
        @Size(max = 100)
        private String name;

        @Size(max = 200)
        private String nameEn;

        @Size(max = 200)
        private String nameJa;

        @Size(max = 200)
        private String nameKo;

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
        private String itemCode;
        private String spec;
        private String description;
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
        private String nameEn;
        private String nameJa;
        private String nameKo;
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
        private String itemCode;
        private String spec;
        private String description;
        private LocalDateTime createdAt;

        // Operational fields (V6)
        private String stockUnit;
        private String orderUnit;
        private Double conversionQty;
        private Integer minOrderQty;
        private Double parLevel;
        private String countCycle;
        private String storageZone;
        private String itemGrade;
        private Long substituteItemId;
        private String lotTracking;
        private Double dailyUsageAvg;
        private Boolean isPosTracked;
    }
}
