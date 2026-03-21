package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.DailyPhysicalCount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyPhysicalCountRepository extends JpaRepository<DailyPhysicalCount, Long> {

    List<DailyPhysicalCount> findByStoreIdAndCountDateBetween(Long storeId, LocalDate startDate, LocalDate endDate);

    Optional<DailyPhysicalCount> findByStoreIdAndItemIdAndCountDate(Long storeId, Long itemId, LocalDate countDate);
}
