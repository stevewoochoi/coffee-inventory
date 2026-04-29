package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class PackagingDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Item ID is required")
        private Long itemId;

        @NotBlank(message = "Pack name is required")
        private String packName;

        @NotNull(message = "Units per pack is required")
        private BigDecimal unitsPerPack;

        private String packBarcode;
        private BigDecimal boxPrice;
        private Long supplierId;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long itemId;
        private String packName;
        private BigDecimal unitsPerPack;
        private String packBarcode;
        private String imageUrl;
        private String status;
        private LocalDateTime createdAt;
        // 추가 필드
        private String itemName;
        private String baseUnit;
        private String categoryName;
        private Long categoryId;
        private List<SupplierItemInfo> supplierItems;
        private BigDecimal itemPrice;
        private Boolean vatInclusive;
        private String currency;
    }

    @Getter
    @Builder
    public static class SupplierItemInfo {
        private Long supplierItemId;
        private Long supplierId;
        private String supplierName;
        private BigDecimal price;
        private String supplierSku;
        private Integer leadTimeDays;
    }
}
