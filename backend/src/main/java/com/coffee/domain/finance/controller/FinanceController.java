package com.coffee.domain.finance.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.finance.dto.FinanceDto;
import com.coffee.domain.finance.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_FINANCE')")
public class FinanceController {

    private final FinanceService financeService;

    @GetMapping("/purchase-summary")
    public ApiResponse<FinanceDto.PurchaseSummary> getPurchaseSummary(
            @RequestParam Long brandId,
            @RequestParam int year,
            @RequestParam int month) {
        return ApiResponse.ok(financeService.getPurchaseSummary(brandId, year, month));
    }

    @GetMapping("/inventory-valuation")
    public ApiResponse<FinanceDto.InventoryValuation> getInventoryValuation(
            @RequestParam Long brandId) {
        return ApiResponse.ok(financeService.getInventoryValuation(brandId));
    }

    @GetMapping("/monthly-report")
    public ApiResponse<FinanceDto.MonthlyReport> getMonthlyReport(
            @RequestParam Long brandId,
            @RequestParam int year,
            @RequestParam int month) {
        return ApiResponse.ok(financeService.getMonthlyReport(brandId, year, month));
    }

    @PostMapping("/monthly-closing")
    public ApiResponse<FinanceDto.ClosingResponse> executeClosing(
            @RequestBody FinanceDto.ClosingRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(financeService.executeMonthlyClosing(
                request.getBrandId(), request.getYear(), request.getMonth(), user.getId()));
    }

    @GetMapping("/closing-history")
    public ApiResponse<List<FinanceDto.ClosingResponse>> getClosingHistory(@RequestParam Long brandId) {
        return ApiResponse.ok(financeService.getClosingHistory(brandId));
    }
}
