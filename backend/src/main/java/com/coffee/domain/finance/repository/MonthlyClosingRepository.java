package com.coffee.domain.finance.repository;

import com.coffee.domain.finance.entity.MonthlyClosing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MonthlyClosingRepository extends JpaRepository<MonthlyClosing, Long> {
    Optional<MonthlyClosing> findByBrandIdAndClosingYearAndClosingMonth(Long brandId, Integer year, Integer month);
    List<MonthlyClosing> findByBrandIdOrderByClosingYearDescClosingMonthDesc(Long brandId);
}
