package com.coffee.domain.pos.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PosSalesDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Store ID is required")
        private Long storeId;

        @NotNull(message = "Business date is required")
        private LocalDate businessDate;

        @NotNull(message = "Menu ID is required")
        private Long menuId;

        private String optionJson;
        private Integer qty;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long storeId;
        private LocalDate businessDate;
        private Long menuId;
        private String optionJson;
        private Integer qty;
        private LocalDateTime createdAt;
    }
}
