package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ItemCategoryRepository extends JpaRepository<ItemCategory, Long> {

    List<ItemCategory> findByBrandIdAndIsActiveTrue(Long brandId);

    List<ItemCategory> findByBrandIdAndIsActiveTrueOrderByDisplayOrderAsc(Long brandId);

    List<ItemCategory> findByBrandIdOrderByDisplayOrderAsc(Long brandId);

    Optional<ItemCategory> findByBrandIdAndName(Long brandId, String name);

    List<ItemCategory> findByBrandIdAndLevelAndIsActiveTrueOrderByDisplayOrderAsc(Long brandId, Integer level);

    List<ItemCategory> findByBrandIdAndParentIdAndIsActiveTrueOrderByDisplayOrderAsc(Long brandId, Long parentId);

    List<ItemCategory> findByParentId(Long parentId);

    Optional<ItemCategory> findByBrandIdAndParentIdAndName(Long brandId, Long parentId, String name);

    @Query("SELECT c FROM ItemCategory c WHERE c.brandId = :brandId AND c.parentId IS NULL AND c.name = :name")
    Optional<ItemCategory> findRootByBrandIdAndName(@Param("brandId") Long brandId, @Param("name") String name);
}
