package com.coffee.domain.receiving.repository;

import com.coffee.domain.receiving.entity.Delivery;
import com.coffee.domain.receiving.entity.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    List<Delivery> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<Delivery> findByStoreIdAndStatusIn(Long storeId, List<DeliveryStatus> statuses);
}
