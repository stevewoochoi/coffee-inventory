package com.coffee.domain.warehouse.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.inventory.dto.CycleCountDto;
import com.coffee.domain.warehouse.service.WarehouseCycleCountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/warehouses/{warehouseId}/cycle-count")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
public class WarehouseCycleCountController {

    private final WarehouseCycleCountService cycleCountService;

    @PostMapping
    public ResponseEntity<ApiResponse<CycleCountDto.SessionDetailResponse>> start(
            @PathVariable Long warehouseId,
            @RequestParam(required = false) String gradeFilter,
            @RequestParam(required = false) String zoneFilter,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(cycleCountService.start(
                warehouseId, user.getBrandId(), gradeFilter, zoneFilter, user.getId())));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<CycleCountDto.SessionResponse>>> listActive(
            @PathVariable Long warehouseId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.listActive(warehouseId, user.getBrandId())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CycleCountDto.SessionResponse>>> history(
            @PathVariable Long warehouseId,
            Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.getHistory(warehouseId, user.getBrandId(), pageable)));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<CycleCountDto.SessionDetailResponse>> detail(
            @PathVariable Long warehouseId,
            @PathVariable Long sessionId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.getSession(warehouseId, user.getBrandId(), sessionId)));
    }

    @PutMapping("/lines/{lineId}")
    public ResponseEntity<ApiResponse<CycleCountDto.LineResponse>> updateLine(
            @PathVariable Long warehouseId,
            @PathVariable Long lineId,
            @RequestParam(required = false) Double countedQty,
            @RequestParam(required = false) String note,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.updateLine(warehouseId, user.getBrandId(), lineId, countedQty, note)));
    }

    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<ApiResponse<CycleCountDto.SessionDetailResponse>> complete(
            @PathVariable Long warehouseId,
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "true") Boolean applyAdjustments,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.complete(warehouseId, user.getBrandId(), sessionId, applyAdjustments)));
    }
}
