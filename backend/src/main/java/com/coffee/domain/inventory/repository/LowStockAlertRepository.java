package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.LowStockAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LowStockAlertRepository extends JpaRepository<LowStockAlert, Long> {

    List<LowStockAlert> findByStoreIdOrderByDetectedAtDesc(Long storeId);

    void deleteByStoreId(Long storeId);
}
