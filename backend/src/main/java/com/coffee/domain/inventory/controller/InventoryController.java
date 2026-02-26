package com.coffee.domain.inventory.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.inventory.dto.AdjustDto;
import com.coffee.domain.inventory.dto.ExpiryAlertDto;
import com.coffee.domain.inventory.dto.ForecastDto;
import com.coffee.domain.inventory.dto.LowStockDto;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.service.ExpiryAlertService;
import com.coffee.domain.inventory.service.ForecastService;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.inventory.service.LowStockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final ExpiryAlertService expiryAlertService;
    private final LowStockService lowStockService;
    private final ForecastService forecastService;
    private final InventorySnapshotRepository snapshotRepository;

    @GetMapping("/snapshot")
    public ResponseEntity<ApiResponse<List<InventorySnapshot>>> getSnapshot(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getSnapshot(storeId)));
    }

    @GetMapping("/snapshot/lots")
    public ResponseEntity<ApiResponse<List<InventorySnapshot>>> getSnapshotLots(
            @RequestParam Long storeId,
            @RequestParam Long itemId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getSnapshotLots(storeId, itemId)));
    }

    @GetMapping("/ledger")
    public ResponseEntity<ApiResponse<Page<StockLedger>>> getLedger(
            @RequestParam Long storeId,
            @RequestParam(required = false) Long itemId,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLedger(storeId, itemId, pageable)));
    }

    @GetMapping("/expiry-alerts")
    public ResponseEntity<ApiResponse<List<ExpiryAlertDto.Response>>> getExpiryAlerts(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(expiryAlertService.getActiveAlertsByStore(storeId)));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<LowStockDto.Response>>> getLowStock(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(lowStockService.getLowStockItems(storeId)));
    }

    @GetMapping("/forecast")
    public ResponseEntity<ApiResponse<ForecastDto.Response>> getForecast(
            @RequestParam Long storeId,
            @RequestParam(required = false) Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(forecastService.getForecast(storeId, brandId)));
    }

    @PostMapping("/adjust")
    public ResponseEntity<ApiResponse<AdjustDto.Response>> adjust(
            @Valid @RequestBody AdjustDto.Request request) {
        BigDecimal currentQty = snapshotRepository.sumQtyByStoreIdAndItemId(request.getStoreId(), request.getItemId());
        BigDecimal delta = request.getNewQtyBaseUnit().subtract(currentQty);

        if (delta.compareTo(BigDecimal.ZERO) != 0) {
            inventoryService.recordStockChange(
                    request.getStoreId(),
                    request.getItemId(),
                    delta,
                    LedgerType.ADJUST,
                    "ADJUST",
                    null,
                    request.getMemo() != null ? request.getMemo() : "Stock adjustment",
                    null
            );
        }

        return ResponseEntity.ok(ApiResponse.ok(AdjustDto.Response.builder()
                .storeId(request.getStoreId())
                .itemId(request.getItemId())
                .previousQty(currentQty)
                .newQty(request.getNewQtyBaseUnit())
                .delta(delta)
                .build(), "Stock adjusted"));
    }
}
