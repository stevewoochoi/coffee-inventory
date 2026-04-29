package com.coffee.domain.warehouse.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.warehouse.service.WarehouseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/warehouses/{warehouseId}/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
public class WarehouseOrderController {

    private final WarehouseOrderService warehouseOrderService;

    /** External suppliers only (internal_warehouse_store_id IS NULL). */
    @GetMapping("/catalog/suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getExternalSuppliers(
            @PathVariable Long warehouseId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                warehouseOrderService.getExternalSuppliers(warehouseId, user.getBrandId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderPlanDto.Response>> create(
            @PathVariable Long warehouseId,
            @Valid @RequestBody OrderPlanDto.CreateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                warehouseOrderService.createOrder(warehouseId, user.getBrandId(), request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderPlan>>> list(
            @PathVariable Long warehouseId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                warehouseOrderService.listOrders(warehouseId, user.getBrandId())));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderPlanDto.DetailedResponse>> detail(
            @PathVariable Long warehouseId,
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                warehouseOrderService.getOrderDetail(warehouseId, user.getBrandId(), orderId)));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable Long warehouseId,
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails user) {
        warehouseOrderService.cancel(warehouseId, user.getBrandId(), orderId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Order cancelled"));
    }
}
