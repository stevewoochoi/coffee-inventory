package com.coffee.domain.recipe.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "recipe_component")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RecipeComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "menu_id")
    private Long menuId;

    @Column(name = "option_id")
    private Long optionId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "qty_base_unit", nullable = false, precision = 10, scale = 3)
    private BigDecimal qtyBaseUnit;
}
