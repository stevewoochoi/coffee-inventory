package com.coffee.domain.inventory.repository;

import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface StockLedgerRepository extends JpaRepository<StockLedger, Long> {

    Page<StockLedger> findByStoreIdAndItemIdOrderByCreatedAtDesc(Long storeId, Long itemId, Pageable pageable);

    Page<StockLedger> findByStoreIdOrderByCreatedAtDesc(Long storeId, Pageable pageable);

    @Query("SELECT sl.itemId, SUM(ABS(sl.qtyBaseUnit)) FROM StockLedger sl " +
            "WHERE sl.storeId = :storeId AND sl.type = :type AND sl.createdAt >= :since " +
            "GROUP BY sl.itemId")
    List<Object[]> sumQtyByStoreIdAndTypeSince(
            @Param("storeId") Long storeId,
            @Param("type") LedgerType type,
            @Param("since") LocalDateTime since);
}
