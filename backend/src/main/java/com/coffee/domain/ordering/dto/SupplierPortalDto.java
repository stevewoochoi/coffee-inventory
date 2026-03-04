package com.coffee.domain.ordering.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class SupplierPortalDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class OrderSummary {
        private Long orderPlanId;
        private Long storeId;
        private String storeName;
        private LocalDate deliveryDate;
        private String status;
        private String fulfillmentStatus;
        private BigDecimal totalAmount;
        private int lineCount;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    public static class NotifyRequest {
        private String notificationType;
        private String message;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class NotificationResponse {
        private Long id;
        private Long orderPlanId;
        private String notificationType;
        private String message;
        private LocalDateTime createdAt;
    }
}
