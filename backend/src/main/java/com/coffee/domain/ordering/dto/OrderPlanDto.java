package com.coffee.domain.ordering.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

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
        @NotNull private Integer packQty;
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
    }
}
