package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PackagingDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Item ID is required")
        private Long itemId;

        @NotBlank(message = "Pack name is required")
        private String packName;

        @NotNull(message = "Units per pack is required")
        private BigDecimal unitsPerPack;

        private String packBarcode;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long itemId;
        private String packName;
        private BigDecimal unitsPerPack;
        private String packBarcode;
        private String imageUrl;
        private String status;
        private LocalDateTime createdAt;
    }
}
