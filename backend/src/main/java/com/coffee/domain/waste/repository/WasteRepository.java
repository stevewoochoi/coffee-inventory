package com.coffee.domain.waste.repository;

import com.coffee.domain.waste.entity.Waste;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WasteRepository extends JpaRepository<Waste, Long> {

    List<Waste> findByStoreIdOrderByCreatedAtDesc(Long storeId);
}
