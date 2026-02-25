package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderDispatchLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderDispatchLogRepository extends JpaRepository<OrderDispatchLog, Long> {
}
