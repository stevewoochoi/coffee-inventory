package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.DeliveryPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryPolicyRepository extends JpaRepository<DeliveryPolicy, Long> {

    List<DeliveryPolicy> findByBrandIdAndIsActiveTrue(Long brandId);
}
