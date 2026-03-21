package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.CycleCountLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CycleCountLineRepository extends JpaRepository<CycleCountLine, Long> {
    List<CycleCountLine> findBySessionIdOrderByStorageZoneAscItemGradeAsc(Long sessionId);
    long countBySessionIdAndCountedQtyIsNotNull(Long sessionId);
}
