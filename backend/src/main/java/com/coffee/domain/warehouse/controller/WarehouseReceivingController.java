package com.coffee.domain.warehouse.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.receiving.dto.DeliveryDto;
import com.coffee.domain.receiving.dto.OrderReceivingDto;
import com.coffee.domain.warehouse.service.WarehouseReceivingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/warehouses/{warehouseId}/receiving")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY','FULFILLMENT')")
public class WarehouseReceivingController {

    private final WarehouseReceivingService receivingService;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<OrderReceivingDto.PendingOrderResponse>>> pending(
            @PathVariable Long warehouseId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                receivingService.getPending(warehouseId, user.getBrandId())));
    }

    @PostMapping("/from-order/{orderId}")
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> startFromOrder(
            @PathVariable Long warehouseId,
            @PathVariable Long orderId,
            @Valid @RequestBody OrderReceivingDto.ReceiveRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                receivingService.receiveFromOrder(warehouseId, user.getBrandId(), orderId, request, user.getId())));
    }

    @PostMapping("/deliveries/{deliveryId}/confirm")
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> confirm(
            @PathVariable Long warehouseId,
            @PathVariable Long deliveryId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                receivingService.confirm(warehouseId, user.getBrandId(), deliveryId, user.getId())));
    }
}
