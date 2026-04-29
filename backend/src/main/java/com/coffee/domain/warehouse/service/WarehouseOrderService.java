package com.coffee.domain.warehouse.service;

import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import com.coffee.domain.ordering.service.OrderConfirmService;
import com.coffee.domain.ordering.service.OrderingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Warehouse-side ordering: warehouse purchases from external suppliers.
 * Reuses existing OrderingService.create / cancel etc. — store_id = warehouseId.
 */
@Service
@RequiredArgsConstructor
public class WarehouseOrderService {

    private final WarehouseService warehouseService;
    private final SupplierRepository supplierRepository;
    private final OrderingService orderingService;
    private final OrderConfirmService orderConfirmService;
    private final OrderPlanRepository orderPlanRepository;

    /** External suppliers only (internal_warehouse_store_id IS NULL). */
    @Transactional(readOnly = true)
    public List<Supplier> getExternalSuppliers(Long warehouseId, Long brandId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return supplierRepository.findByBrandIdAndInternalWarehouseStoreIdIsNull(brandId);
    }

    @Transactional
    public OrderPlanDto.Response createOrder(Long warehouseId, Long brandId,
                                              OrderPlanDto.CreateRequest req) {
        warehouseService.getWarehouse(warehouseId, brandId);
        // Force store_id = warehouse_id
        req.setStoreId(warehouseId);
        return orderingService.create(req);
    }

    @Transactional(readOnly = true)
    public List<OrderPlan> listOrders(Long warehouseId, Long brandId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return orderPlanRepository.findByStoreIdOrderByCreatedAtDesc(warehouseId);
    }

    @Transactional(readOnly = true)
    public OrderPlanDto.DetailedResponse getOrderDetail(Long warehouseId, Long brandId, Long orderId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        OrderPlan plan = orderPlanRepository.findById(orderId).orElseThrow();
        if (!warehouseId.equals(plan.getStoreId())) {
            throw new com.coffee.common.exception.BusinessException(
                    "Order does not belong to this warehouse",
                    org.springframework.http.HttpStatus.FORBIDDEN);
        }
        return orderingService.findDetailedById(orderId);
    }

    @Transactional
    public void cancel(Long warehouseId, Long brandId, Long orderId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        OrderPlan plan = orderPlanRepository.findById(orderId)
                .orElseThrow();
        if (!warehouseId.equals(plan.getStoreId())) {
            throw new com.coffee.common.exception.BusinessException(
                    "Order does not belong to this warehouse", org.springframework.http.HttpStatus.FORBIDDEN);
        }
        orderConfirmService.cancelOrder(orderId);
    }
}

