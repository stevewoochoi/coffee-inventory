package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.CycleCountSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CycleCountSessionRepository extends JpaRepository<CycleCountSession, Long> {
    List<CycleCountSession> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, String status);
    Page<CycleCountSession> findByStoreIdOrderByCreatedAtDesc(Long storeId, Pageable pageable);
}
