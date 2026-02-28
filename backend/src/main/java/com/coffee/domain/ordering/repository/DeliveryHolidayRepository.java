package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.DeliveryHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DeliveryHolidayRepository extends JpaRepository<DeliveryHoliday, Long> {

    List<DeliveryHoliday> findByBrandIdAndHolidayDateBetween(Long brandId, LocalDate from, LocalDate to);

    List<DeliveryHoliday> findByBrandIdOrderByHolidayDateAsc(Long brandId);
}
