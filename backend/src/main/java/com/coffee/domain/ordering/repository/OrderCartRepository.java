package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderCart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderCartRepository extends JpaRepository<OrderCart, Long> {

    Optional<OrderCart> findByStoreIdAndUserId(Long storeId, Long userId);
}
