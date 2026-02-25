package com.coffee.domain.inventory.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FifoStockService {

    private final InventorySnapshotRepository snapshotRepository;
    private final StockLedgerRepository stockLedgerRepository;

    /**
     * 입고: lot_no + exp_date 기준으로 재고 적재
     */
    @Transactional
    public StockLedger receiveStock(Long storeId, Long itemId, BigDecimal qty,
                                     LocalDate expDate, String lotNo,
                                     String refType, Long refId, String memo, Long createdBy) {
        StockLedger ledger = StockLedger.builder()
                .storeId(storeId)
                .itemId(itemId)
                .qtyBaseUnit(qty)
                .expDate(expDate)
                .lotNo(lotNo)
                .type(LedgerType.RECEIVE)
                .refType(refType)
                .refId(refId)
                .memo(memo)
                .createdBy(createdBy)
                .build();
        stockLedgerRepository.save(ledger);

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
        snapshotRepository.save(snapshot);

        return ledger;
    }

    /**
     * FIFO 차감: exp_date 오름차순으로 가장 오래된 lot부터 차감
     * 반환값: 차감에 사용된 StockLedger 목록
     */
    @Transactional
    public List<StockLedger> deductFifo(Long storeId, Long itemId, BigDecimal totalQty,
                                         LedgerType type, String refType, Long refId,
                                         String memo, Long createdBy) {
        List<InventorySnapshot> lots = snapshotRepository.findAvailableLotsByFifo(storeId, itemId);

        BigDecimal totalAvailable = lots.stream()
                .map(InventorySnapshot::getQtyBaseUnit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAvailable.compareTo(totalQty) < 0) {
            throw new BusinessException(
                    String.format("Insufficient FIFO stock for item %d at store %d. Available: %s, Requested: %s",
                            itemId, storeId, totalAvailable, totalQty),
                    HttpStatus.BAD_REQUEST);
        }

        BigDecimal remaining = totalQty;
        List<StockLedger> ledgers = new ArrayList<>();

        for (InventorySnapshot lot : lots) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal deductQty = lot.getQtyBaseUnit().min(remaining);
            lot.setQtyBaseUnit(lot.getQtyBaseUnit().subtract(deductQty));
            snapshotRepository.save(lot);

            StockLedger ledger = StockLedger.builder()
                    .storeId(storeId)
                    .itemId(itemId)
                    .qtyBaseUnit(deductQty.negate())
                    .expDate(lot.getExpDate())
                    .lotNo(lot.getLotNo())
                    .type(type)
                    .refType(refType)
                    .refId(refId)
                    .memo(memo)
                    .createdBy(createdBy)
                    .build();
            ledgers.add(stockLedgerRepository.save(ledger));

            remaining = remaining.subtract(deductQty);
        }

        return ledgers;
    }

    /**
     * lot별 현재 재고 조회
     */
    @Transactional(readOnly = true)
    public List<InventorySnapshot> getLotSnapshots(Long storeId, Long itemId) {
        return snapshotRepository.findByStoreIdAndItemIdOrderByExpDateAsc(storeId, itemId);
    }
}
