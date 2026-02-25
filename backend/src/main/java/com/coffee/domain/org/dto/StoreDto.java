package com.coffee.domain.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class StoreDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Brand ID is required")
        private Long brandId;

        @NotBlank(message = "Store name is required")
        @Size(max = 100, message = "Store name must be 100 characters or less")
        private String name;

        @Size(max = 50)
        private String timezone;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long brandId;
        private String name;
        private String timezone;
        private LocalDateTime createdAt;
    }
}
