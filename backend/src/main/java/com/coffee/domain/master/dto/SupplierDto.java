package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class SupplierDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Brand ID is required")
        private Long brandId;

        @NotBlank(message = "Supplier name is required")
        private String name;

        private String email;
        private String bizNo;
        private String representative;
        private String phone;
        private String address;
        private String memo;
        private String orderMethod;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long brandId;
        private String name;
        private String email;
        private String bizNo;
        private String representative;
        private String phone;
        private String address;
        private String memo;
        private String orderMethod;
        private LocalDateTime createdAt;
    }
}
