package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.ordering.dto.FulfillmentDto;
import com.coffee.domain.ordering.service.FulfillmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/ordering")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY', 'FULFILLMENT')")
public class AdminOrderController {

    private final FulfillmentService fulfillmentService;

    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<FulfillmentDto.AdminPlanListResponse>> getPlans(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String fulfillmentStatus) {
        return ResponseEntity.ok(ApiResponse.ok(
                fulfillmentService.getAdminPlans(status, fulfillmentStatus)));
    }

    @GetMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<FulfillmentDto.AdminPlanResponse>> getPlan(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fulfillmentService.getAdminPlan(id)));
    }

    @PutMapping("/plans/{id}/fulfillment")
    public ResponseEntity<ApiResponse<FulfillmentDto.AdminPlanResponse>> updateFulfillment(
            @PathVariable Long id,
            @Valid @RequestBody FulfillmentDto.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                fulfillmentService.updateFulfillmentStatus(id, request),
                "Fulfillment status updated"));
    }
}
