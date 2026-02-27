package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderPlanRepository extends JpaRepository<OrderPlan, Long> {

    List<OrderPlan> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<OrderPlan> findByStoreIdAndStatusInAndCreatedAtBetween(
            Long storeId, List<OrderStatus> statuses, LocalDateTime from, LocalDateTime to);

    List<OrderPlan> findByStatusAndCutoffAtBefore(OrderStatus status, LocalDateTime cutoff);
}
