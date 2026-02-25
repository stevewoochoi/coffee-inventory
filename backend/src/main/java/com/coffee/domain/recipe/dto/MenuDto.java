package com.coffee.domain.recipe.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

public class MenuDto {

    @Getter
    @Setter
    public static class Request {
        @NotNull(message = "Brand ID is required")
        private Long brandId;

        @NotBlank(message = "Menu name is required")
        private String name;

        private String posMenuId;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long brandId;
        private String name;
        private String posMenuId;
        private Boolean isActive;
    }
}
