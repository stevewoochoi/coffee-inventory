package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderCartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderCartItemRepository extends JpaRepository<OrderCartItem, Long> {

    List<OrderCartItem> findByCartId(Long cartId);

    Optional<OrderCartItem> findByCartIdAndPackagingIdAndSupplierId(Long cartId, Long packagingId, Long supplierId);

    void deleteByCartId(Long cartId);
}
