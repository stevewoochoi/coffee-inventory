package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.ordering.dto.CutoffDto;
import com.coffee.domain.ordering.service.OrderCutoffService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/ordering")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
public class OrderCutoffController {

    private final OrderCutoffService cutoffService;

    @PostMapping("/cutoff")
    public ApiResponse<CutoffDto.CutoffResult> executeCutoff(
            @RequestBody CutoffDto.CutoffRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(cutoffService.executeCutoff(request.getDeliveryDate(), user.getId()));
    }

    @GetMapping("/shortage-check")
    public ApiResponse<CutoffDto.ShortageCheckResult> checkShortage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deliveryDate,
            @RequestParam Long brandId) {
        return ApiResponse.ok(cutoffService.checkShortage(deliveryDate, brandId));
    }

    @PutMapping("/plans/{planId}/lines/{lineId}/adjust")
    public ApiResponse<Void> adjustOrderLine(
            @PathVariable Long planId,
            @PathVariable Long lineId,
            @RequestBody CutoffDto.AdjustRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        cutoffService.adjustOrderLine(planId, lineId, request.getAdjustedQty(), request.getReason(), user.getId());
        return ApiResponse.ok(null, "Order line adjusted");
    }

    @PostMapping("/dispatch-all")
    public ApiResponse<CutoffDto.DispatchResult> dispatchAll(
            @RequestBody CutoffDto.CutoffRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(cutoffService.dispatchAll(request.getDeliveryDate(), user.getId()));
    }
}
