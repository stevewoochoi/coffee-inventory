package com.coffee.domain.ordering.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

public class OrderCartDto {

    @Getter
    @Setter
    public static class AddItemRequest {
        @NotNull private Long packagingId;
        @NotNull private Long supplierId;
        @NotNull @Min(1) private Integer packQty;
    }

    @Getter
    @Setter
    public static class UpdateItemRequest {
        @NotNull @Min(1) private Integer packQty;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CartResponse {
        private Long cartId;
        private Long storeId;
        private List<SupplierGroup> supplierGroups;
        private BigDecimal grandTotal;
        private int totalItems;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class SupplierGroup {
        private Long supplierId;
        private String supplierName;
        private List<CartItemResponse> items;
        private BigDecimal subtotal;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CartItemResponse {
        private Long id;
        private Long packagingId;
        private String packName;
        private Long itemId;
        private String itemName;
        private BigDecimal unitsPerPack;
        private Integer packQty;
        private BigDecimal price;
        private BigDecimal lineTotal;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ConfirmResponse {
        private List<Long> orderPlanIds;
        private int orderCount;
    }
}
