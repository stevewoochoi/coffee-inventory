package com.coffee.domain.master.dto;

import lombok.*;

import java.time.LocalDateTime;

public class ItemDeliveryScheduleDto {

    @Getter
    @Setter
    public static class Request {
        private Boolean mon;
        private Boolean tue;
        private Boolean wed;
        private Boolean thu;
        private Boolean fri;
        private Boolean sat;
        private Boolean sun;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long itemId;
        private Long brandId;
        private Boolean mon;
        private Boolean tue;
        private Boolean wed;
        private Boolean thu;
        private Boolean fri;
        private Boolean sat;
        private Boolean sun;
        private Boolean isActive;
        private String displayDays;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
