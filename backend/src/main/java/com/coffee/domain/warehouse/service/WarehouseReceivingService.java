package com.coffee.domain.warehouse.service;

import com.coffee.domain.receiving.dto.DeliveryDto;
import com.coffee.domain.receiving.dto.OrderReceivingDto;
import com.coffee.domain.receiving.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Warehouse receiving — delegates to existing DeliveryService.
 * Storage-side delivery + scan + confirm flow is identical for STORE and WAREHOUSE.
 */
@Service
@RequiredArgsConstructor
public class WarehouseReceivingService {

    private final WarehouseService warehouseService;
    private final DeliveryService deliveryService;

    @Transactional(readOnly = true)
    public List<OrderReceivingDto.PendingOrderResponse> getPending(Long warehouseId, Long brandId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return deliveryService.getPendingOrders(warehouseId);
    }

    @Transactional
    public DeliveryDto.Response receiveFromOrder(Long warehouseId, Long brandId, Long orderPlanId,
                                                  OrderReceivingDto.ReceiveRequest request, Long userId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return deliveryService.receiveFromOrder(orderPlanId, request, userId);
    }

    @Transactional
    public DeliveryDto.Response confirm(Long warehouseId, Long brandId, Long deliveryId, Long userId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return deliveryService.confirm(deliveryId, userId);
    }
}
