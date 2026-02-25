package com.coffee.domain.receiving.repository;

import com.coffee.domain.receiving.entity.DeliveryScan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryScanRepository extends JpaRepository<DeliveryScan, Long> {

    List<DeliveryScan> findByDeliveryId(Long deliveryId);
}
