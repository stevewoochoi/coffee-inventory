package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.OrderLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderLineRepository extends JpaRepository<OrderLine, Long> {

    List<OrderLine> findByOrderPlanId(Long orderPlanId);

    List<OrderLine> findByOrderPlanIdAndIsActiveTrue(Long orderPlanId);

    List<OrderLine> findByOrderPlanIdOrderByModificationVersionDescCreatedAtDesc(Long orderPlanId);
}
