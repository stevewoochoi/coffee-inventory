package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderCart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OrderCartRepository extends JpaRepository<OrderCart, Long> {

    Optional<OrderCart> findByStoreIdAndUserId(Long storeId, Long userId);

    Optional<OrderCart> findByStoreIdAndDeliveryDateAndStatus(Long storeId, LocalDate deliveryDate, String status);

    List<OrderCart> findByStoreIdAndStatus(Long storeId, String status);

    List<OrderCart> findByStoreIdAndStatusOrderByDeliveryDateAsc(Long storeId, String status);
}
