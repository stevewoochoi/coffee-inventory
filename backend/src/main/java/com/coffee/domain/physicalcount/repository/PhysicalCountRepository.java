package com.coffee.domain.physicalcount.repository;

import com.coffee.domain.physicalcount.entity.PhysicalCount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhysicalCountRepository extends JpaRepository<PhysicalCount, Long> {

    List<PhysicalCount> findByStoreIdOrderByCreatedAtDesc(Long storeId);
}
