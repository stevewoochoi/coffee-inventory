package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.ordering.dto.SupplierPortalDto;
import com.coffee.domain.ordering.service.SupplierPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/supplier-portal")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPPLIER', 'FULFILLMENT', 'SUPER_ADMIN', 'BRAND_ADMIN')")
public class SupplierPortalController {

    private final SupplierPortalService portalService;

    @GetMapping("/orders")
    public ApiResponse<List<SupplierPortalDto.OrderSummary>> getOrders(
            @RequestParam Long supplierId,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(portalService.getSupplierOrders(supplierId, status));
    }

    @PostMapping("/orders/{orderPlanId}/notify")
    public ApiResponse<SupplierPortalDto.NotificationResponse> notify(
            @PathVariable Long orderPlanId,
            @RequestParam Long supplierId,
            @RequestBody SupplierPortalDto.NotifyRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(portalService.notify(
                orderPlanId, supplierId, request.getNotificationType(), request.getMessage(), user.getId()));
    }

    @GetMapping("/orders/{orderPlanId}/notifications")
    public ApiResponse<List<SupplierPortalDto.NotificationResponse>> getNotifications(
            @PathVariable Long orderPlanId) {
        return ApiResponse.ok(portalService.getNotifications(orderPlanId));
    }
}
