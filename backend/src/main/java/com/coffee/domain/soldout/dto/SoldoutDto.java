package com.coffee.domain.soldout.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

public class SoldoutDto {

    @Getter
    @Setter
    public static class RegisterRequest {
        @NotNull private Long storeId;
        @NotNull private Long itemId;
        private String reason;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long storeId;
        private Long itemId;
        private String itemName;
        private String reason;
        private Long registeredBy;
        private LocalDateTime registeredAt;
        private LocalDateTime resolvedAt;
        private Boolean isActive;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ListResponse {
        private List<Response> items;
        private long activeCount;
    }
}
