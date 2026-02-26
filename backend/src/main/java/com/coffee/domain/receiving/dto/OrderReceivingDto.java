package com.coffee.domain.receiving.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class OrderReceivingDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PendingOrderResponse {
        private Long orderPlanId;
        private Long supplierId;
        private String supplierName;
        private String status;
        private List<OrderLineDetail> lines;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class OrderLineDetail {
        private Long packagingId;
        private String packName;
        private String itemName;
        private Integer orderedPackQty;
    }

    @Getter
    @Setter
    public static class ReceiveRequest {
        @NotNull private List<ReceiveLine> lines;
    }

    @Getter
    @Setter
    public static class ReceiveLine {
        @NotNull private Long packagingId;
        @NotNull private Integer packQty;
        private String lotNo;
        private LocalDate expDate;
    }
}
