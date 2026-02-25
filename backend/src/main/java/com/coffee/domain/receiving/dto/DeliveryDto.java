package com.coffee.domain.receiving.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DeliveryDto {

    @Getter
    @Setter
    public static class CreateRequest {
        @NotNull(message = "Store ID is required")
        private Long storeId;

        @NotNull(message = "Supplier ID is required")
        private Long supplierId;

        private LocalDate expectedAt;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long storeId;
        private Long supplierId;
        private LocalDate expectedAt;
        private String status;
        private LocalDateTime createdAt;
    }
}
