package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.SupplierOrderNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierOrderNotificationRepository extends JpaRepository<SupplierOrderNotification, Long> {
    List<SupplierOrderNotification> findByOrderPlanIdOrderByCreatedAtDesc(Long orderPlanId);
    List<SupplierOrderNotification> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
}
