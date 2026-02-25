package com.coffee.domain.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class CompanyDto {

    @Getter
    @Setter
    public static class Request {
        @NotBlank(message = "Company name is required")
        @Size(max = 100, message = "Company name must be 100 characters or less")
        private String name;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private String name;
        private LocalDateTime createdAt;
    }
}
