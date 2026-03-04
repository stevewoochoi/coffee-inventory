package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.ItemDeliverySchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ItemDeliveryScheduleRepository extends JpaRepository<ItemDeliverySchedule, Long> {

    Optional<ItemDeliverySchedule> findByItemIdAndBrandId(Long itemId, Long brandId);

    List<ItemDeliverySchedule> findByBrandIdAndIsActiveTrue(Long brandId);
}
