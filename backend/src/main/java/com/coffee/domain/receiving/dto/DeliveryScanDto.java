package com.coffee.domain.receiving.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DeliveryScanDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Packaging ID is required")
        private Long packagingId;

        private String lotNo;
        private LocalDate expDate;
        private Integer packCountScanned;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long deliveryId;
        private Long packagingId;
        private String lotNo;
        private LocalDate expDate;
        private Integer packCountScanned;
        private LocalDateTime scannedAt;
    }
}
