package com.coffee.domain.ordering.repository;

import com.coffee.domain.ordering.entity.StoreDeliveryPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreDeliveryPolicyRepository extends JpaRepository<StoreDeliveryPolicy, Long> {

    List<StoreDeliveryPolicy> findByStoreId(Long storeId);

    Optional<StoreDeliveryPolicy> findByStoreIdAndIsDefaultTrue(Long storeId);
}
