package com.coffee.domain.report.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.report.dto.ReportDto;
import com.coffee.domain.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER', 'JP_ORDERER')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/consumption")
    public ResponseEntity<ApiResponse<ReportDto.ConsumptionReport>> consumption(
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getConsumptionReport(storeId, from, to)));
    }

    @GetMapping("/waste")
    public ResponseEntity<ApiResponse<ReportDto.WasteReport>> waste(
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getWasteReport(storeId, from, to)));
    }

    @GetMapping("/loss-rate")
    public ResponseEntity<ApiResponse<ReportDto.LossRateReport>> lossRate(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getLossRateReport(storeId)));
    }

    @GetMapping("/order-cost")
    public ResponseEntity<ApiResponse<ReportDto.OrderCostReport>> orderCost(
            @RequestParam Long storeId,
            @RequestParam String month) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getOrderCostReport(storeId, month)));
    }
}
