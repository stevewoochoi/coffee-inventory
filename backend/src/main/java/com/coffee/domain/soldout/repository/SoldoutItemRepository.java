package com.coffee.domain.soldout.repository;

import com.coffee.domain.soldout.entity.SoldoutItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SoldoutItemRepository extends JpaRepository<SoldoutItem, Long> {

    List<SoldoutItem> findByStoreIdAndIsActiveTrueOrderByRegisteredAtDesc(Long storeId);

    List<SoldoutItem> findByStoreIdOrderByRegisteredAtDesc(Long storeId);

    Optional<SoldoutItem> findByStoreIdAndItemIdAndIsActiveTrue(Long storeId, Long itemId);

    long countByStoreIdAndIsActiveTrue(Long storeId);
}
