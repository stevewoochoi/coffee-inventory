package com.coffee.domain.recipe.repository;

import com.coffee.domain.recipe.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    List<Menu> findByBrandIdAndIsActiveTrue(Long brandId);

    Optional<Menu> findByIdAndIsActiveTrue(Long id);
}
