package com.coffee.domain.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class BrandDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Company ID is required")
        private Long companyId;

        @NotBlank(message = "Brand name is required")
        @Size(max = 100, message = "Brand name must be 100 characters or less")
        private String name;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long companyId;
        private String name;
        private LocalDateTime createdAt;
    }
}
