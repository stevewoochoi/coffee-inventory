package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderShortageLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderShortageLogRepository extends JpaRepository<OrderShortageLog, Long> {
    List<OrderShortageLog> findByOrderPlanId(Long orderPlanId);
}
