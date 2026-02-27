package com.coffee.domain.audit.repository;

import com.coffee.domain.audit.entity.InventoryAuditLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryAuditLineRepository extends JpaRepository<InventoryAuditLine, Long> {

    List<InventoryAuditLine> findByAuditId(Long auditId);

    void deleteByAuditId(Long auditId);
}
