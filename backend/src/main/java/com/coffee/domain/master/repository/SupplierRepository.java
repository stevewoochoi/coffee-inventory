package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    List<Supplier> findByBrandId(Long brandId);

    List<Supplier> findByBrandIdAndInternalWarehouseStoreIdIsNull(Long brandId);

    List<Supplier> findByInternalWarehouseStoreId(Long internalWarehouseStoreId);

    boolean existsByBrandIdAndName(Long brandId, String name);
}
