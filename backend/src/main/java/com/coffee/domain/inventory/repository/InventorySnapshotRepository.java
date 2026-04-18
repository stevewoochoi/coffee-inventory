package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.InventorySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface InventorySnapshotRepository extends JpaRepository<InventorySnapshot, Long> {

    Optional<InventorySnapshot> findByStoreIdAndItemId(Long storeId, Long itemId);

    List<InventorySnapshot> findByStoreId(Long storeId);

    Optional<InventorySnapshot> findByStoreIdAndItemIdAndExpDateAndLotNo(
            Long storeId, Long itemId, java.time.LocalDate expDate, String lotNo);

    List<InventorySnapshot> findByStoreIdAndItemIdOrderByExpDateAsc(Long storeId, Long itemId);

    @Query("SELECT s FROM InventorySnapshot s WHERE s.storeId = :storeId AND s.itemId = :itemId " +
            "AND s.qtyBaseUnit > 0 ORDER BY CASE WHEN s.expDate IS NULL THEN 1 ELSE 0 END, s.expDate ASC")
    List<InventorySnapshot> findAvailableLotsByFifo(
            @Param("storeId") Long storeId, @Param("itemId") Long itemId);

    @Query("SELECT s FROM InventorySnapshot s WHERE s.storeId = :storeId " +
            "AND s.expDate IS NOT NULL AND s.qtyBaseUnit > 0")
    List<InventorySnapshot> findAllLotsWithExpDate(@Param("storeId") Long storeId);

    @Query("SELECT COALESCE(SUM(s.qtyBaseUnit), 0) FROM InventorySnapshot s " +
            "WHERE s.storeId = :storeId AND s.itemId = :itemId")
    BigDecimal sumQtyByStoreIdAndItemId(@Param("storeId") Long storeId, @Param("itemId") Long itemId);
}
