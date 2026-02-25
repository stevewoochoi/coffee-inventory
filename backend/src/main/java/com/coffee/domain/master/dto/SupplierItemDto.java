package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

public class SupplierItemDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Supplier ID is required")
        private Long supplierId;

        @NotNull(message = "Packaging ID is required")
        private Long packagingId;

        private String supplierSku;
        private Integer leadTimeDays;
        private BigDecimal price;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long supplierId;
        private Long packagingId;
        private String supplierSku;
        private Integer leadTimeDays;
        private BigDecimal price;
    }
}
