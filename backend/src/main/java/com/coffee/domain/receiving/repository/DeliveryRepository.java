package com.coffee.domain.receiving.repository;

import com.coffee.domain.receiving.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    List<Delivery> findByStoreIdOrderByCreatedAtDesc(Long storeId);
}
