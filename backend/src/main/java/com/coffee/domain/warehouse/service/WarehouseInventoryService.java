package com.coffee.domain.warehouse.service;

import com.coffee.domain.inventory.dto.ForecastDto;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.inventory.service.FifoStockService;
import com.coffee.domain.inventory.service.ForecastService;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.warehouse.dto.WarehouseAdjustRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Warehouse inventory operations — delegates to existing infrastructure.
 * Adds permission boundary (brand check) but no new business logic.
 */
@Service
@RequiredArgsConstructor
public class WarehouseInventoryService {

    private final WarehouseService warehouseService;
    private final ForecastService forecastService;
    private final FifoStockService fifoStockService;
    private final StockLedgerRepository ledgerRepository;
    private final InventorySnapshotRepository snapshotRepository;

    @Transactional(readOnly = true)
    public ForecastDto.Response getInventory(Long warehouseId, Long brandId) {
        Store warehouse = warehouseService.getWarehouse(warehouseId, brandId);
        return forecastService.getForecast(warehouse.getId(), brandId);
    }

    @Transactional(readOnly = true)
    public List<InventorySnapshot> getLots(Long warehouseId, Long itemId, Long brandId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return fifoStockService.getLotSnapshots(warehouseId, itemId);
    }

    @Transactional(readOnly = true)
    public Page<StockLedger> getLedger(Long warehouseId, Long itemId, Long brandId, Pageable pageable) {
        warehouseService.getWarehouse(warehouseId, brandId);
        if (itemId != null) {
            return ledgerRepository.findByStoreIdAndItemIdOrderByCreatedAtDesc(warehouseId, itemId, pageable);
        }
        return ledgerRepository.findByStoreIdOrderByCreatedAtDesc(warehouseId, pageable);
    }

    /**
     * Quick adjust: ADJUST ledger 1 row.
     * Positive qtyDelta -> increase (treated like RECEIVE flow), negative -> deduct via FIFO.
     */
    @Transactional
    public void adjust(Long warehouseId, Long brandId, WarehouseAdjustRequest req, Long actorUserId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        BigDecimal delta = req.getQtyDelta();
        if (delta == null || delta.signum() == 0) return;

        String memo = req.getReason() != null ? "[" + req.getReason() + "] " : "";
        if (req.getMemo() != null) memo = memo + req.getMemo();

        if (delta.signum() > 0) {
            // increase — use receiveStock with ADJUST type
            StockLedger ledger = StockLedger.builder()
                    .storeId(warehouseId)
                    .itemId(req.getItemId())
                    .qtyBaseUnit(delta)
                    .expDate(req.getExpDate())
                    .lotNo(req.getLotNo())
                    .type(LedgerType.ADJUST)
                    .refType("MANUAL_ADJUST")
                    .memo(memo)
                    .createdBy(actorUserId)
                    .build();
            ledgerRepository.save(ledger);

            InventorySnapshot snapshot = snapshotRepository
                    .findByStoreIdAndItemIdAndExpDateAndLotNo(warehouseId, req.getItemId(), req.getExpDate(), req.getLotNo())
                    .orElseGet(() -> InventorySnapshot.builder()
                            .storeId(warehouseId)
                            .itemId(req.getItemId())
                            .expDate(req.getExpDate())
                            .lotNo(req.getLotNo())
                            .qtyBaseUnit(BigDecimal.ZERO)
                            .build());
            snapshot.setQtyBaseUnit(snapshot.getQtyBaseUnit().add(delta));
            snapshotRepository.save(snapshot);
        } else {
            // decrease — FIFO consume, type=ADJUST
            fifoStockService.deductFifo(
                    warehouseId, req.getItemId(), delta.negate(),
                    LedgerType.ADJUST, "MANUAL_ADJUST", null, memo, actorUserId);
        }
    }
}
