package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.ItemExpiryAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ItemExpiryAlertRepository extends JpaRepository<ItemExpiryAlert, Long> {

    List<ItemExpiryAlert> findByStoreIdAndAlertStatusIn(Long storeId, List<AlertStatus> statuses);

    List<ItemExpiryAlert> findByStoreId(Long storeId);

    Optional<ItemExpiryAlert> findByStoreIdAndItemIdAndLotNo(Long storeId, Long itemId, String lotNo);

    List<ItemExpiryAlert> findByAlertStatusNot(AlertStatus status);
}
