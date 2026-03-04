package com.coffee.domain.master.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

public class ItemCategoryDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull private Long brandId;
        @NotNull private String name;
        private Long parentId;
        private String code;
        private String description;
        private String icon;
        private Integer displayOrder;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long brandId;
        private Long parentId;
        private Integer level;
        private String name;
        private String code;
        private String description;
        private String icon;
        private Integer displayOrder;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class TreeResponse {
        private Long id;
        private String name;
        private Integer level;
        private String code;
        private String icon;
        private Integer displayOrder;
        private List<TreeResponse> children;
    }
}
