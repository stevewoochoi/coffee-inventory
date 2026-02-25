package com.coffee.domain.dashboard.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.dashboard.dto.DashboardDto;
import com.coffee.domain.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/store/{storeId}")
    public ResponseEntity<ApiResponse<DashboardDto.StoreDashboard>> storeDashboard(
            @PathVariable Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStoreDashboard(storeId)));
    }

    @GetMapping("/brand/{brandId}")
    public ResponseEntity<ApiResponse<DashboardDto.BrandDashboard>> brandDashboard(
            @PathVariable Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getBrandDashboard(brandId)));
    }
}
