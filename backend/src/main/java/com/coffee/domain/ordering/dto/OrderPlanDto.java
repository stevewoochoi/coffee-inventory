package com.coffee.domain.ordering.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class OrderPlanDto {

    @Getter
    @Setter
    public static class CreateRequest {
        @NotNull private Long storeId;
        @NotNull private Long supplierId;
        private List<OrderLineDto> lines;
    }

    @Getter
    @Setter
    public static class OrderLineDto {
        @NotNull private Long packagingId;
        @NotNull @Min(1) private Integer packQty;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long storeId;
        private Long supplierId;
        private String status;
        private Boolean recommendedByAi;
        private LocalDateTime createdAt;
        private String currency;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class HistoryResponse {
        private Long id;
        private Long storeId;
        private Long supplierId;
        private String supplierName;
        private String status;
        private List<HistoryLine> lines;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class DetailedResponse {
        private Long id;
        private Long storeId;
        private String storeName;
        private Long supplierId;
        private String supplierName;
        private String status;
        private String fulfillmentStatus;
        private java.time.LocalDate deliveryDate;
        private LocalDateTime cutoffAt;
        private BigDecimal totalAmount;
        private BigDecimal vatAmount;
        private String currency;
        private Boolean recommendedByAi;
        private List<HistoryLine> lines;
        private LocalDateTime createdAt;
        private LocalDateTime confirmedAt;
        private LocalDateTime dispatchedAt;
        private LocalDateTime receivedAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class HistoryLine {
        private Long packagingId;
        private String packName;
        private Long itemId;
        private String itemName;
        private Integer packQty;
        private BigDecimal unitsPerPack;
        private BigDecimal price;
        private String currency;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ConfirmCartResponse {
        private List<Long> orderPlanIds;
        private int orderCount;
        private BigDecimal totalAmount;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class SummaryResponse {
        private Long supplierId;
        private String supplierName;
        private Long orderCount;
        private BigDecimal totalAmount;
        private String currency;
    }

    @Getter
    @Setter
    public static class ModifyRequest {
        private List<OrderLineDto> lines;
    }
}
