package com.coffee.domain.recipe.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

public class RecipeComponentDto {

    @Getter
    @Setter
    public static class Request {
        private Long menuId;
        private Long optionId;

        @NotNull(message = "Item ID is required")
        private Long itemId;

        @NotNull(message = "Quantity is required")
        private BigDecimal qtyBaseUnit;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long menuId;
        private Long optionId;
        private Long itemId;
        private BigDecimal qtyBaseUnit;
    }
}
