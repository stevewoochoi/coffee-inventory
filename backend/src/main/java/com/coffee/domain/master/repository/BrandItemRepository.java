package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.BrandItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BrandItemRepository extends JpaRepository<BrandItem, Long> {

    List<BrandItem> findByBrandIdAndIsActiveTrue(Long brandId);

    List<BrandItem> findByItemIdAndIsActiveTrue(Long itemId);

    Optional<BrandItem> findByBrandIdAndItemId(Long brandId, Long itemId);

    Optional<BrandItem> findByBrandIdAndItemIdAndIsActiveTrue(Long brandId, Long itemId);

    boolean existsByBrandIdAndItemIdAndIsActiveTrue(Long brandId, Long itemId);
}
