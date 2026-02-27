package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.SupplierItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SupplierItemRepository extends JpaRepository<SupplierItem, Long> {

    List<SupplierItem> findBySupplierId(Long supplierId);

    List<SupplierItem> findByPackagingId(Long packagingId);

    Optional<SupplierItem> findBySupplierIdAndPackagingId(Long supplierId, Long packagingId);
}
