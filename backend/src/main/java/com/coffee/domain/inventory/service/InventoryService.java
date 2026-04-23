package com.coffee.domain.inventory.service;

import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private static final int MAX_RETRY = 3;

    private final StockLedgerRepository stockLedgerRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final EntityManager entityManager;

    /**
     * 재고 변동 기록 (lot/유통기한 포함) - 낙관적 잠금 + 재시도
     */
    @Transactional
    public StockLedger recordStockChange(Long storeId, Long itemId, BigDecimal qty,
                                          LedgerType type, String refType, Long refId,
                                          String memo, Long createdBy,
                                          LocalDate expDate, String lotNo) {
        StockLedger ledger = StockLedger.builder()
                .storeId(storeId)
                .itemId(itemId)
                .qtyBaseUnit(qty)
                .expDate(expDate)
                .lotNo(lotNo)
                .type(type)
                .refType(refType)
                .refId(refId)
                .memo(memo)
                .createdBy(createdBy)
                .build();
        stockLedgerRepository.save(ledger);

        updateSnapshotWithRetry(storeId, itemId, qty, expDate, lotNo);

        return ledger;
    }

    private void updateSnapshotWithRetry(Long storeId, Long itemId, BigDecimal qty,
                                          LocalDate expDate, String lotNo) {
        for (int attempt = 0; attempt < MAX_RETRY; attempt++) {
            try {
                InventorySnapshot snapshot = snapshotRepository
                        .findByStoreIdAndItemIdAndExpDateAndLotNo(storeId, itemId, expDate, lotNo)
                        .orElseGet(() -> InventorySnapshot.builder()
                                .storeId(storeId)
                                .itemId(itemId)
                                .expDate(expDate)
                                .lotNo(lotNo)
                                .qtyBaseUnit(BigDecimal.ZERO)
                                .build());
                snapshot.setQtyBaseUnit(snapshot.getQtyBaseUnit().add(qty));
                snapshotRepository.saveAndFlush(snapshot);
                return;
            } catch (ObjectOptimisticLockingFailureException e) {
                log.warn("Optimistic lock conflict on snapshot (store={}, item={}, attempt={}), retrying...",
                        storeId, itemId, attempt + 1);
                if (attempt == MAX_RETRY - 1) {
                    throw e;
                }
                entityManager.clear();
            }
        }
    }

    /**
     * 하위호환: lot/유통기한 없이 호출
     */
    @Transactional
    public StockLedger recordStockChange(Long storeId, Long itemId, BigDecimal qty,
                                          LedgerType type, String refType, Long refId,
                                          String memo, Long createdBy) {
        return recordStockChange(storeId, itemId, qty, type, refType, refId,
                memo, createdBy, null, null);
    }

    @Transactional(readOnly = true)
    public List<InventorySnapshot> getSnapshot(Long storeId) {
        return snapshotRepository.findByStoreId(storeId);
    }

    @Transactional(readOnly = true)
    public List<InventorySnapshot> getSnapshotLots(Long storeId, Long itemId) {
        return snapshotRepository.findByStoreIdAndItemIdOrderByExpDateAsc(storeId, itemId);
    }

    @Transactional(readOnly = true)
    public Page<StockLedger> getLedger(Long storeId, Long itemId, Pageable pageable) {
        if (itemId != null) {
            return stockLedgerRepository.findByStoreIdAndItemIdOrderByCreatedAtDesc(storeId, itemId, pageable);
        }
        return stockLedgerRepository.findByStoreIdOrderByCreatedAtDesc(storeId, pageable);
    }
}
