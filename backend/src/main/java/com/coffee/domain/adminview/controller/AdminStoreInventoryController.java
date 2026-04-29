package com.coffee.domain.adminview.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.adminview.service.AdminStoreInventoryService;
import com.coffee.domain.inventory.dto.ForecastDto;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.org.entity.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/stores")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY','KR_FINANCE')")
public class AdminStoreInventoryController {

    private final AdminStoreInventoryService service;

    /** Brand's STORE type stores only (WAREHOUSE excluded). */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Store>>> listStores(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(service.listStores(user.getBrandId())));
    }

    @GetMapping("/{storeId}/inventory")
    public ResponseEntity<ApiResponse<ForecastDto.Response>> getInventory(
            @PathVariable Long storeId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.getInventory(storeId, user.getBrandId())));
    }

    @GetMapping("/{storeId}/inventory/ledger")
    public ResponseEntity<ApiResponse<Page<StockLedger>>> getLedger(
            @PathVariable Long storeId,
            @RequestParam(required = false) Long itemId,
            Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.getLedger(storeId, user.getBrandId(), itemId, pageable)));
    }

    @GetMapping(value = "/{storeId}/inventory/export",
                produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportExcel(
            @PathVariable Long storeId,
            @AuthenticationPrincipal CustomUserDetails user) {
        byte[] data = service.exportExcel(storeId, user.getBrandId());
        String fname = URLEncoder.encode("store-inventory-" + storeId + ".xlsx", StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + fname)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
