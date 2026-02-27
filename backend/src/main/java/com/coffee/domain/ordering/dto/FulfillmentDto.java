package com.coffee.domain.ordering.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class FulfillmentDto {

    @Getter
    @Setter
    public static class UpdateRequest {
        @NotNull private String fulfillmentStatus;
        private String note;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AdminPlanResponse {
        private Long id;
        private Long storeId;
        private String storeName;
        private Long supplierId;
        private String supplierName;
        private String status;
        private String fulfillmentStatus;
        private LocalDate deliveryDate;
        private LocalDateTime cutoffAt;
        private BigDecimal totalAmount;
        private BigDecimal vatAmount;
        private List<OrderPlanDto.HistoryLine> lines;
        private LocalDateTime confirmedAt;
        private LocalDateTime dispatchedAt;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AdminPlanListResponse {
        private List<AdminPlanResponse> plans;
        private long totalCount;
    }
}
