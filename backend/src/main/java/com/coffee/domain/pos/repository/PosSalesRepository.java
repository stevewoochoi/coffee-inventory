package com.coffee.domain.pos.repository;

import com.coffee.domain.pos.entity.PosSales;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PosSalesRepository extends JpaRepository<PosSales, Long> {

    List<PosSales> findByStoreIdAndBusinessDate(Long storeId, LocalDate businessDate);
}
