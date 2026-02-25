package com.coffee.domain.recipe.repository;

import com.coffee.domain.recipe.entity.RecipeComponent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeComponentRepository extends JpaRepository<RecipeComponent, Long> {

    List<RecipeComponent> findByMenuId(Long menuId);

    List<RecipeComponent> findByMenuIdAndOptionIdIsNull(Long menuId);

    List<RecipeComponent> findByOptionId(Long optionId);
}
