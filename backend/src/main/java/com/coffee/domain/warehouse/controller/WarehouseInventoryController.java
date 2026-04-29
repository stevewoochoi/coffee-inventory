package com.coffee.domain.warehouse.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.inventory.dto.ForecastDto;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.warehouse.dto.WarehouseAdjustRequest;
import com.coffee.domain.warehouse.dto.WarehouseDto;
import com.coffee.domain.warehouse.service.WarehouseInventoryService;
import com.coffee.domain.warehouse.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/warehouses")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY','KR_FINANCE')")
public class WarehouseInventoryController {

    private final WarehouseService warehouseService;
    private final WarehouseInventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WarehouseDto>>> list(
            @AuthenticationPrincipal CustomUserDetails user) {
        List<Store> stores = warehouseService.getWarehousesForBrand(user.getBrandId());
        return ResponseEntity.ok(ApiResponse.ok(stores.stream().map(WarehouseDto::from).toList()));
    }

    @GetMapping("/{warehouseId}/inventory")
    public ResponseEntity<ApiResponse<ForecastDto.Response>> getInventory(
            @PathVariable Long warehouseId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                inventoryService.getInventory(warehouseId, user.getBrandId())));
    }

    @GetMapping("/{warehouseId}/inventory/lots")
    public ResponseEntity<ApiResponse<List<InventorySnapshot>>> getLots(
            @PathVariable Long warehouseId,
            @RequestParam Long itemId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                inventoryService.getLots(warehouseId, itemId, user.getBrandId())));
    }

    @GetMapping("/{warehouseId}/inventory/ledger")
    public ResponseEntity<ApiResponse<Page<StockLedger>>> getLedger(
            @PathVariable Long warehouseId,
            @RequestParam(required = false) Long itemId,
            Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                inventoryService.getLedger(warehouseId, itemId, user.getBrandId(), pageable)));
    }

    @PostMapping("/{warehouseId}/inventory/adjust")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
    public ResponseEntity<ApiResponse<Void>> adjust(
            @PathVariable Long warehouseId,
            @Valid @RequestBody WarehouseAdjustRequest req,
            @AuthenticationPrincipal CustomUserDetails user) {
        inventoryService.adjust(warehouseId, user.getBrandId(), req, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(null, "Adjustment applied"));
    }
}
