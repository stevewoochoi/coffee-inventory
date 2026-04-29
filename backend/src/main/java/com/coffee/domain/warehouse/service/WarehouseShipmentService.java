package com.coffee.domain.warehouse.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.FifoStockService;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Auto-deduct warehouse stock when a store's OrderPlan transitions to SHIPPING
 * AND its supplier has internal_warehouse_store_id set (=internal supplier).
 *
 * No-op for external suppliers (internal_warehouse_store_id IS NULL).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseShipmentService {

    private final SupplierRepository supplierRepository;
    private final OrderLineRepository orderLineRepository;
    private final PackagingRepository packagingRepository;
    private final FifoStockService fifoStockService;

    /**
     * Called inside the same transaction that flips fulfillment_status to SHIPPING.
     * Throws BusinessException(409) on insufficient stock so the transaction rolls back.
     */
    @Transactional
    public void shipFromWarehouse(OrderPlan plan, Long actorUserId) {
        Supplier supplier = supplierRepository.findById(plan.getSupplierId()).orElse(null);
        if (supplier == null) return;
        if (!supplier.isInternalSupplier()) {
            return;  // external supplier: no-op (preserves legacy flow)
        }

        Long warehouseStoreId = supplier.getInternalWarehouseStoreId();
        List<OrderLine> lines = orderLineRepository.findByOrderPlanIdAndIsActiveTrue(plan.getId());

        for (OrderLine line : lines) {
            Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
            if (pkg == null || pkg.getItemId() == null) {
                throw new BusinessException(
                        "Packaging not found for line " + line.getId(),
                        HttpStatus.BAD_REQUEST,
                        "WAREHOUSE_PACKAGING_NOT_FOUND");
            }
            BigDecimal unitsPerPack = pkg.getUnitsPerPack() != null ? pkg.getUnitsPerPack() : BigDecimal.ONE;
            BigDecimal qtyBase = unitsPerPack.multiply(BigDecimal.valueOf(line.getPackQty()));

            try {
                fifoStockService.deductFifo(
                        warehouseStoreId,
                        pkg.getItemId(),
                        qtyBase,
                        LedgerType.SHIP_OUT,
                        "ORDER_PLAN",
                        plan.getId(),
                        "Store #" + plan.getStoreId() + " shipment",
                        actorUserId
                );
            } catch (BusinessException be) {
                throw new BusinessException(
                        "창고 재고 부족: item=" + pkg.getItemId() + " qty=" + qtyBase + " (" + be.getMessage() + ")",
                        HttpStatus.CONFLICT,
                        "WAREHOUSE_INSUFFICIENT_STOCK");
            }
        }

        log.info("Warehouse SHIP_OUT done. plan={}, warehouse={}, lines={}",
                plan.getId(), warehouseStoreId, lines.size());
    }
}
