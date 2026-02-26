package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class ItemCategoryDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull private Long brandId;
        @NotNull private String name;
        private Integer displayOrder;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long brandId;
        private String name;
        private Integer displayOrder;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }
}
