package com.coffee.domain.audit.repository;

import com.coffee.domain.audit.entity.AuditStatus;
import com.coffee.domain.audit.entity.InventoryAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryAuditRepository extends JpaRepository<InventoryAudit, Long> {

    List<InventoryAudit> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<InventoryAudit> findByStoreIdAndStatus(Long storeId, AuditStatus status);

    long countByStoreIdAndStatus(Long storeId, AuditStatus status);
}
