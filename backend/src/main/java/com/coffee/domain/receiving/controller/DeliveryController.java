package com.coffee.domain.receiving.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.inventory.dto.QuickReceiveDto;
import com.coffee.domain.receiving.dto.DeliveryDto;
import com.coffee.domain.receiving.dto.DeliveryScanDto;
import com.coffee.domain.receiving.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/receiving/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeliveryDto.Response>>> findByStoreId(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.findByStoreId(storeId)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<DeliveryDto.Response>>> history(
            @RequestParam Long storeId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.findHistory(storeId, from, to, status)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> create(
            @Valid @RequestBody DeliveryDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(deliveryService.create(request), "Delivery created"));
    }

    @PostMapping("/{id}/scans")
    public ResponseEntity<ApiResponse<DeliveryScanDto.Response>> addScan(
            @PathVariable Long id, @Valid @RequestBody DeliveryScanDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(deliveryService.addScan(id, request), "Scan added"));
    }

    @GetMapping("/{id}/scans")
    public ResponseEntity<ApiResponse<List<DeliveryScanDto.Response>>> getScans(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.getScans(id)));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> confirm(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                deliveryService.confirm(id, user != null ? user.getId() : null), "Delivery confirmed"));
    }

    @PostMapping("/{id}/quick-confirm")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'KR_INVENTORY', 'SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> quickConfirm(
            @PathVariable Long id,
            @RequestBody QuickReceiveDto.QuickConfirmRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.quickConfirm(id, request)));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<DeliveryDto.Response>>> getPendingDeliveries(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.getPendingDeliveries(storeId)));
    }
}
