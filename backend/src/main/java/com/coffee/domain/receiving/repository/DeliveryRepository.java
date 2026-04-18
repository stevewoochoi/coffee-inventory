package com.coffee.domain.receiving.repository;

import com.coffee.domain.receiving.entity.Delivery;
import com.coffee.domain.receiving.entity.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    List<Delivery> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<Delivery> findByStoreIdAndStatusIn(Long storeId, List<DeliveryStatus> statuses);

    List<Delivery> findByStoreIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long storeId, LocalDateTime from, LocalDateTime to);

    List<Delivery> findByStoreIdAndStatusAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long storeId, DeliveryStatus status, LocalDateTime from, LocalDateTime to);

    List<Delivery> findByOrderPlanId(Long orderPlanId);
}
