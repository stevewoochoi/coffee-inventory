package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ItemCategoryRepository extends JpaRepository<ItemCategory, Long> {

    List<ItemCategory> findByBrandIdAndIsActiveTrueOrderByDisplayOrderAsc(Long brandId);

    List<ItemCategory> findByBrandIdOrderByDisplayOrderAsc(Long brandId);

    Optional<ItemCategory> findByBrandIdAndName(Long brandId, String name);
}
